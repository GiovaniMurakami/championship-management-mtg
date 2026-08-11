import { FiltrosListarUsuarios } from "../../dominio/gateway/usuarioGateway";
import { escaparRegex } from "../regex";

/**
 * Filtro Mongo para listagem de usuários.
 * Docs legados sem `excluido` / `bloqueadoTorneios` devem contar como ativos
 * (`$ne: true`), pois `{ campo: false }` não casa documento sem o campo.
 */
export function montarFiltroListagemUsuarios(
  filtros: FiltrosListarUsuarios = {},
): Record<string, unknown> {
  const filtroQuery: Record<string, unknown> = {
    excluido: filtros.excluido === true ? true : { $ne: true },
  };

  if (filtros.nome) {
    const regex = { $regex: escaparRegex(filtros.nome), $options: "i" };
    filtroQuery.$or = [{ nome: regex }, { email: regex }];
  }

  if (filtros.bloqueadoTorneios !== undefined) {
    filtroQuery.bloqueadoTorneios =
      filtros.bloqueadoTorneios === true ? true : { $ne: true };
  }

  return filtroQuery;
}
