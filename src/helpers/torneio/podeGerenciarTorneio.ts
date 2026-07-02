import { Torneio } from "../../dominio/entidade/torneio";

export function podeGerenciarTorneio(
  torneio: Pick<Torneio, "donoId" | "anfitriaoId">,
  usuarioId: string,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (torneio.donoId === usuarioId) return true;
  if (torneio.anfitriaoId && torneio.anfitriaoId === usuarioId) return true;
  return false;
}
