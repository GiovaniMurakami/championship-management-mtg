import { z } from "zod";

export const uuidCampo = (nome = "id") =>
  z.string().uuid(`${nome} deve ser um UUID válido.`);

export const paginacaoQueryCampos = {
  limite: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
};
