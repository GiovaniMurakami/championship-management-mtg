import jwt from "jsonwebtoken";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

export type JwtPayload = {
  id: string;
  email: string;
  nome: string;
  role: string;
};

let cachedPrivateKey: string | undefined;
let cachedPublicKey: string | undefined;

export function resetJwtKeyCache(): void {
  cachedPrivateKey = undefined;
  cachedPublicKey = undefined;
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function hasBase64KeyPair(): boolean {
  return !!(process.env.JWT_PRIVATE_KEY_BASE64 && process.env.JWT_PUBLIC_KEY_BASE64);
}

function hasSsmKeyPair(): boolean {
  return !!(process.env.JWT_SSM_PRIVATE_KEY_PARAM && process.env.JWT_SSM_PUBLIC_KEY_PARAM);
}

function hasPartialKeyConfig(): boolean {
  return (
    (!!process.env.JWT_PRIVATE_KEY_BASE64 !== !!process.env.JWT_PUBLIC_KEY_BASE64) ||
    (!!process.env.JWT_SSM_PRIVATE_KEY_PARAM !== !!process.env.JWT_SSM_PUBLIC_KEY_PARAM)
  );
}

export function assertJwtConfig(): void {
  if (hasPartialKeyConfig()) {
    throw new Error(
      "Configuração JWT inválida. Configure o par completo de chaves RSA em Base64 ou via SSM."
    );
  }

  if (hasBase64KeyPair() || hasSsmKeyPair()) {
    return;
  }

  if (!isProductionRuntime() && process.env.JWT_SECRET) {
    return;
  }

  throw new Error(
    isProductionRuntime()
      ? "Configuração JWT ausente. Em produção, configure o par RSA via Base64 ou SSM."
      : "Configuração JWT ausente. Use JWT_SECRET em desenvolvimento local ou configure um par RSA."
  );
}

function loadKeyFromEnv(envVar: string): string | undefined {
  const raw = process.env[envVar];
  if (!raw) return undefined;
  return Buffer.from(raw, "base64").toString("utf-8");
}

async function fetchFromSSM(paramName: string): Promise<string> {
  const client = new SSMClient({});
  const res = await client.send(new GetParameterCommand({ Name: paramName, WithDecryption: true }));
  if (!res.Parameter?.Value) {
    throw new Error(`Parâmetro SSM ${paramName} não retornou valor.`);
  }
  return res.Parameter.Value;
}

export async function preloadJwtKeys(): Promise<void> {
  resetJwtKeyCache();

  if (hasBase64KeyPair()) {
    cachedPrivateKey = Buffer.from(process.env.JWT_PRIVATE_KEY_BASE64!, "base64").toString("utf-8");
    cachedPublicKey = Buffer.from(process.env.JWT_PUBLIC_KEY_BASE64!, "base64").toString("utf-8");
    return;
  }

  if (hasSsmKeyPair()) {
    cachedPrivateKey = await fetchFromSSM(process.env.JWT_SSM_PRIVATE_KEY_PARAM!);
    cachedPublicKey = await fetchFromSSM(process.env.JWT_SSM_PUBLIC_KEY_PARAM!);
  }
}

function getSigningConfig(): { key: string; algorithm: jwt.Algorithm } | null {
  if (cachedPrivateKey) return { key: cachedPrivateKey, algorithm: "RS256" };

  // Fallback for local dev when preloadJwtKeys() was not awaited
  const privateKey = loadKeyFromEnv("JWT_PRIVATE_KEY_BASE64");
  if (privateKey) return { key: privateKey, algorithm: "RS256" };

  // HS256 only allowed outside production — RS256 from SSM is mandatory in prod
  if (process.env.NODE_ENV !== "production") {
    const secret = process.env.JWT_SECRET;
    if (secret) return { key: secret, algorithm: "HS256" };
  }

  return null;
}

function getVerifyConfig(): { key: string; algorithms: jwt.Algorithm[] } | null {
  if (cachedPublicKey) return { key: cachedPublicKey, algorithms: ["RS256"] };

  // Fallback for local dev when preloadJwtKeys() was not awaited
  const publicKey = loadKeyFromEnv("JWT_PUBLIC_KEY_BASE64");
  if (publicKey) return { key: publicKey, algorithms: ["RS256"] };

  // HS256 only allowed outside production
  if (process.env.NODE_ENV !== "production") {
    const secret = process.env.JWT_SECRET;
    if (secret) return { key: secret, algorithms: ["HS256"] };
  }

  return null;
}

export function signToken(payload: JwtPayload, expiresIn: string): string | null {
  const config = getSigningConfig();
  if (!config) return null;
  return jwt.sign(payload, config.key, { algorithm: config.algorithm, expiresIn: expiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): JwtPayload | null {
  const config = getVerifyConfig();
  if (!config) return null;
  try {
    return jwt.verify(token, config.key, { algorithms: config.algorithms }) as JwtPayload;
  } catch {
    return null;
  }
}
