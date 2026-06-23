import { z } from "zod";
import { Request, Response, NextFunction, RequestHandler } from "express";

export function validarParams<T extends z.ZodTypeAny>(
  schema: T,
  params: unknown,
  response: Response
): z.infer<T> | null {
  const resultado = schema.safeParse(params);
  if (!resultado.success) {
    const erros = resultado.error.issues.map((i) => i.message);
    response.status(400).json({ mensagem: erros[0], erros });
    return null;
  }
  return resultado.data;
}

export function validarParamsMiddleware<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dados = validarParams(schema, req.params, res);
    if (!dados) return;
    req.paramsValidados = dados;
    next();
  };
}
