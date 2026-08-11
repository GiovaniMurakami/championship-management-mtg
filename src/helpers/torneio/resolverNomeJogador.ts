import { ExibirNomeJogador } from "../../dominio/entidade/torneio";
import { Usuario } from "../../dominio/entidade/usuario";

export const USUARIO_EXCLUIDO_NOME = "Usuário excluído";

export function isUsuarioExcluido(usuario?: Pick<Usuario, "excluido"> | null): boolean {
  return Boolean(usuario?.excluido);
}

/** Resolve o nome exibido do jogador conforme a configuração do torneio. */
export function resolverNomeJogador(u: Usuario, modo: ExibirNomeJogador = "nome"): string {
  if (isUsuarioExcluido(u)) return USUARIO_EXCLUIDO_NOME;
  if (modo === "nickMOL") return u.nickMTGO ?? u.nome;
  if (modo === "nickArena") return u.nickArena ?? u.nome;
  return u.nome;
}

export function toUsuarioPublico(
  usuario: Usuario | null | undefined,
  fallbackId = "",
): { id: string; nome: string; excluido: boolean } {
  if (!usuario) {
    return {
      id: fallbackId,
      nome: fallbackId || USUARIO_EXCLUIDO_NOME,
      excluido: false,
    };
  }

  return {
    id: usuario.id,
    nome: isUsuarioExcluido(usuario) ? USUARIO_EXCLUIDO_NOME : usuario.nome,
    excluido: isUsuarioExcluido(usuario),
  };
}
