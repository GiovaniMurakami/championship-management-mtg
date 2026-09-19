import crypto from "crypto";

function segredoNewsletter(): string {
  return (
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET?.trim()
    || process.env.JWT_SECRET?.trim()
    || process.env.JWT_PRIVATE_KEY_BASE64?.trim()
    || "fuguete-newsletter-dev"
  );
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

/** Token estável para descadastro one-click (sem expiração). */
export function criarTokenDescadastroNewsletter(usuarioId: string): string {
  const id = String(usuarioId || "").trim();
  const assinatura = crypto
    .createHmac("sha256", segredoNewsletter())
    .update(`newsletter-unsub:${id}`)
    .digest();
  return `${base64UrlEncode(Buffer.from(id, "utf8"))}.${base64UrlEncode(assinatura)}`;
}

export function validarTokenDescadastroNewsletter(token: string): string | null {
  const bruto = String(token || "").trim();
  const [idPart, sigPart] = bruto.split(".");
  if (!idPart || !sigPart) return null;
  try {
    const usuarioId = base64UrlDecode(idPart).toString("utf8");
    if (!usuarioId) return null;
    const esperado = crypto
      .createHmac("sha256", segredoNewsletter())
      .update(`newsletter-unsub:${usuarioId}`)
      .digest();
    const recebido = base64UrlDecode(sigPart);
    if (esperado.length !== recebido.length) return null;
    if (!crypto.timingSafeEqual(esperado, recebido)) return null;
    return usuarioId;
  } catch {
    return null;
  }
}
