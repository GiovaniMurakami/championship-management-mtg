import { Request, Response, NextFunction } from "express";

/** Campos que podem conter markup do blog (tags customizadas ou HTML legado). */
const CAMPOS_MARKUP_PERMITIDO = new Set(["conteudo"]);

function sanitizarString(valor: string, permitirMarkup = false): string {
  const semNull = valor.replace(/\0/g, "");
  if (permitirMarkup) return semNull;
  return semNull.replace(/<[^>]*>/g, "");
}

function sanitizar(valor: unknown, chaveCampo?: string): unknown {
  if (typeof valor === "string") {
    return sanitizarString(valor, chaveCampo !== undefined && CAMPOS_MARKUP_PERMITIDO.has(chaveCampo));
  }
  if (Array.isArray(valor)) {
    return valor.map((item) => sanitizar(item));
  }
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, sanitizar(v, k)])
    );
  }
  return valor;
}

export const sanitizarEntrada = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) req.body = sanitizar(req.body);
  if (req.query) req.query = sanitizar(req.query) as typeof req.query;
  if (req.params) req.params = sanitizar(req.params) as Record<string, string>;
  next();
};
