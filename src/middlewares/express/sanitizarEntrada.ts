import { Request, Response, NextFunction } from "express";

function sanitizar(valor: unknown): unknown {
  if (typeof valor === "string") {
    return valor
      .replace(/<[^>]*>/g, "")
      .replace(/\0/g, "");
  }
  if (Array.isArray(valor)) {
    return valor.map(sanitizar);
  }
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, sanitizar(v)])
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
