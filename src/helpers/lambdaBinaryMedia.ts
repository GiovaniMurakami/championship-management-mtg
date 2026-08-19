/**
 * Tipos que o serverless-http marca com isBase64Encoded.
 * No API Gateway: os mesmos tipos (nunca wildcard * / * — quebra CORS OPTIONS).
 * No fetch do proxy, enviar Accept: image/* para o gateway decodificar o body.
 */
export const LAMBDA_BINARY_MEDIA_TYPES = ["image/*", "application/octet-stream"] as const;
