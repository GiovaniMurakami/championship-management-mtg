import { z } from "zod";
import { Request, Response, NextFunction, RequestHandler } from "express";

export function validarQuery<T extends z.ZodTypeAny>(
  schema: T,
  query: unknown,
  response: Response
): z.infer<T> | null {
  const resultado = schema.safeParse(query);
  if (!resultado.success) {
    const erros = resultado.error.issues.map((i) => i.message);
    response.status(400).json({ mensagem: erros[0], erros });
    return null;
  }
  return resultado.data;
}

export function validarQueryMiddleware<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dados = validarQuery(schema, req.query, res);
    if (!dados) return;
    req.queryValidados = dados;
    next();
  };
}
