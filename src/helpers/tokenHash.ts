import crypto from "crypto";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf-8").digest("hex");
}
