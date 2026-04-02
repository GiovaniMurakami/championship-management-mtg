import jwt from "jsonwebtoken";

export type JwtPayload = {
  id: string;
  email: string;
  nome: string;
  role: string;
};

function loadKey(envVar: string): string | undefined {
  const raw = process.env[envVar];
  if (!raw) return undefined;
  return Buffer.from(raw, "base64").toString("utf-8");
}

function getSigningConfig(): { key: string; algorithm: jwt.Algorithm } | null {
  const privateKey = loadKey("JWT_PRIVATE_KEY_BASE64");
  if (privateKey) return { key: privateKey, algorithm: "RS256" };

  const secret = process.env.JWT_SECRET;
  if (secret) return { key: secret, algorithm: "HS256" };

  return null;
}

function getVerifyConfig(): { key: string; algorithms: jwt.Algorithm[] } | null {
  const publicKey = loadKey("JWT_PUBLIC_KEY_BASE64");
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
