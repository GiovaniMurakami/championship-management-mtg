import { z } from "zod";
import { Response } from "express";

export function validarBody<T>(schema: z.ZodType<T>, body: unknown, response: Response): T | null {
  const resultado = schema.safeParse(body);
  if (!resultado.success) {
    const erros = resultado.error.issues.map((i) => i.message);
    response.status(400).json({ mensagem: erros[0], erros });
    return null;
  }
  return resultado.data;
}
