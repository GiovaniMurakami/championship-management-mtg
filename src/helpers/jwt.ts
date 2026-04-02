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

function loadKeyFromEnv(envVar: string): string | undefined {
  const raw = process.env[envVar];
  if (!raw) return undefined;
  return Buffer.from(raw, "base64").toString("utf-8");
}

async function fetchFromSSM(paramName: string): Promise<string | undefined> {
  try {
    const client = new SSMClient({});
    const res = await client.send(new GetParameterCommand({ Name: paramName, WithDecryption: true }));
    return res.Parameter?.Value;
  } catch {
    return undefined;
  }
}

export async function preloadJwtKeys(): Promise<void> {
  const privateBase64 = process.env.JWT_PRIVATE_KEY_BASE64;
  if (privateBase64) {
    cachedPrivateKey = Buffer.from(privateBase64, "base64").toString("utf-8");
  } else if (process.env.JWT_SSM_PRIVATE_KEY_PARAM) {
    cachedPrivateKey = await fetchFromSSM(process.env.JWT_SSM_PRIVATE_KEY_PARAM);
  }

  const publicBase64 = process.env.JWT_PUBLIC_KEY_BASE64;
  if (publicBase64) {
    cachedPublicKey = Buffer.from(publicBase64, "base64").toString("utf-8");
  } else if (process.env.JWT_SSM_PUBLIC_KEY_PARAM) {
    cachedPublicKey = await fetchFromSSM(process.env.JWT_SSM_PUBLIC_KEY_PARAM);
  }
}

function getSigningConfig(): { key: string; algorithm: jwt.Algorithm } | null {
  if (cachedPrivateKey) return { key: cachedPrivateKey, algorithm: "RS256" };

  // Fallback for local dev when preloadJwtKeys() was not awaited
  const privateKey = loadKeyFromEnv("JWT_PRIVATE_KEY_BASE64");
  if (privateKey) return { key: privateKey, algorithm: "RS256" };

  const secret = process.env.JWT_SECRET;
  if (secret) return { key: secret, algorithm: "HS256" };

  return null;
}

function getVerifyConfig(): { key: string; algorithms: jwt.Algorithm[] } | null {
  if (cachedPublicKey) return { key: cachedPublicKey, algorithms: ["RS256"] };

  // Fallback for local dev when preloadJwtKeys() was not awaited
  const publicKey = loadKeyFromEnv("JWT_PUBLIC_KEY_BASE64");
  if (publicKey) return { key: publicKey, algorithms: ["RS256"] };

  const secret = process.env.JWT_SECRET;
  if (secret) return { key: secret, algorithms: ["HS256"] };

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
