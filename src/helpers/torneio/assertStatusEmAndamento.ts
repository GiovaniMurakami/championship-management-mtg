import { Torneio } from "../../dominio/entidade/torneio";
import { ErroPersonalizado } from "../error/ErroPersonalizado";
import { StatusErro } from "../error/statusErro";

const MSG_PAUSADO = "Torneio pausado entre Day 1 e Day 2.";

/** Bloqueia mutações de rodada/resultado enquanto o torneio não está em jogo ativo. */
export function assertStatusEmAndamento(
  torneio: Torneio,
  mensagemForaDeAndamento: string,
): void {
  if (torneio.status === "pausado") {
    throw ErroPersonalizado.criar({
      mensagem: MSG_PAUSADO,
      status: StatusErro.erroParametro,
    });
  }
  if (torneio.status !== "em_andamento") {
    throw ErroPersonalizado.criar({
      mensagem: mensagemForaDeAndamento,
      status: StatusErro.erroParametro,
    });
  }
}

export function torneioAceitaDropOuCheckin(status: Torneio["status"]): boolean {
  return status === "em_andamento" || status === "pausado" || status === "inscricoes_abertas";
}
