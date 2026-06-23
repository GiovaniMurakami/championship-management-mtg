import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { ProcessarRankPartida, RankPartidaAplicado } from "../rank/processarRankPartida";

export type RegistrarResultadoInputDto = {
  partidaId: string;
  usuarioId: string;
  isAdmin: boolean;
  vitoriasJogador1: number;
  vitoriasJogador2: number;
};

export type RegistrarResultadoOutputDto = {
  id: string;
  torneioId: string;
  rodada: number;
  jogador1Id: string;
  jogador2Id: string | null;
  deckJogador1Id?: string;
  deckJogador2Id?: string | null;
  vitoriasJogador1: number;
  vitoriasJogador2: number;
  status: string;
  rank?: RankPartidaAplicado | null;
};

export class RegistrarResultado
  implements
  CasoDeUso<RegistrarResultadoInputDto, RegistrarResultadoOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly processarRankPartida: ProcessarRankPartida
  ) { }

  public static criar(
    torneioGateway: TorneioGateway,
    partidaGateway: PartidaGateway,
    usuarioGateway: UsuarioGateway
  ) {
    return new RegistrarResultado(
      torneioGateway,
      partidaGateway,
      ProcessarRankPartida.criar(usuarioGateway, partidaGateway)
    );
  }

  public async executar(
    input: RegistrarResultadoInputDto
  ): Promise<RegistrarResultadoOutputDto> {
    const partida = await this.partidaGateway.buscarPorId(input.partidaId);
    if (!partida) {
      throw ErroPersonalizado.criar({
        mensagem: "Partida não encontrada.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const torneio = await this.torneioGateway.buscarPorId(partida.torneioId);

    if (!torneio || torneio.status !== "em_andamento") {
      throw ErroPersonalizado.criar({
        mensagem: "Resultados só podem ser registrados enquanto o torneio está em andamento.",
        status: StatusErro.erroParametro,
      });
    }
    const ehJogador =
      input.usuarioId === partida.jogador1Id ||
      input.usuarioId === partida.jogador2Id;
    const ehDono = torneio.donoId === input.usuarioId;

    if (!ehJogador && !ehDono && !input.isAdmin) {
      throw ErroPersonalizado.criar({
        mensagem:
          "Apenas os jogadores da partida ou o dono do torneio podem registrar o resultado.",
        status: StatusErro.erroProibido,
      });
    }

    const v1 = input.vitoriasJogador1;
    const v2 = input.vitoriasJogador2;

    if (torneio.emCorte && v1 === v2) {
      throw ErroPersonalizado.criar({
        mensagem:
          "Empates não são permitidos na fase eliminatória. Um jogador deve vencer a partida.",
        status: StatusErro.erroParametro,
      });
    }

    if (
      v1 < 0 ||
      v2 < 0 ||
      v1 > 2 ||
      v2 > 2 ||
      v1 + v2 > 3
    ) {
      throw ErroPersonalizado.criar({
        mensagem:
          "Resultado inválido. Cada jogador pode vencer no máximo 2 jogos e o total não pode ultrapassar 3 (ex: 2-0, 2-1, 1-0, 1-1, 0-0).",
        status: StatusErro.erroParametro,
      });
    }

    const partidaAtualizada = await this.partidaGateway.finalizarAtomicamente(input.partidaId, v1, v2);
    if (!partidaAtualizada) {
      throw ErroPersonalizado.criar({
        mensagem: "Esta partida já teve o resultado registrado.",
        status: StatusErro.erroParametro,
      });
    }

    const rank = await this.processarRankPartida.aplicarParaPartida(partidaAtualizada);

    return {
      id: partidaAtualizada.id,
      torneioId: partidaAtualizada.torneioId,
      rodada: partidaAtualizada.rodada,
      jogador1Id: partidaAtualizada.jogador1Id,
      jogador2Id: partidaAtualizada.jogador2Id,
      deckJogador1Id: partidaAtualizada.deckJogador1Id,
      deckJogador2Id: partidaAtualizada.deckJogador2Id,
      vitoriasJogador1: partidaAtualizada.vitoriasJogador1,
      vitoriasJogador2: partidaAtualizada.vitoriasJogador2,
      status: partidaAtualizada.status,
      rank: rank ?? null,
    };
  }
}
