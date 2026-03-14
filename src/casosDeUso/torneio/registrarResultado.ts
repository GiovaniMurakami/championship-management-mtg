import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type RegistrarResultadoInputDto = {
  partidaId: string;
  usuarioId: string;
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
};

export class RegistrarResultado
  implements
  CasoDeUso<RegistrarResultadoInputDto, RegistrarResultadoOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly partidaGateway: PartidaGateway
  ) { }

  public static criar(
    torneioGateway: TorneioGateway,
    partidaGateway: PartidaGateway
  ) {
    return new RegistrarResultado(torneioGateway, partidaGateway);
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

    if (partida.status === "finalizada") {
      throw ErroPersonalizado.criar({
        mensagem: "Esta partida já teve o resultado registrado.",
        status: StatusErro.erroParametro,
      });
    }

    // Apenas os jogadores envolvidos ou o dono do torneio podem registrar
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

    if (!ehJogador && !ehDono) {
      throw ErroPersonalizado.criar({
        mensagem:
          "Apenas os jogadores da partida ou o dono do torneio podem registrar o resultado.",
        status: StatusErro.erroProibido,
      });
    }

    const v1 = input.vitoriasJogador1;
    const v2 = input.vitoriasJogador2;

    // Validações do resultado BO3: máx 2 vitórias por jogador, máx 3 jogos totais
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

    partida.vitoriasJogador1 = v1;
    partida.vitoriasJogador2 = v2;
    partida.status = "finalizada";

    await this.partidaGateway.atualizar(partida);

    return {
      id: partida.id,
      torneioId: partida.torneioId,
      rodada: partida.rodada,
      jogador1Id: partida.jogador1Id,
      jogador2Id: partida.jogador2Id,
      deckJogador1Id: partida.deckJogador1Id,
      deckJogador2Id: partida.deckJogador2Id,
      vitoriasJogador1: partida.vitoriasJogador1,
      vitoriasJogador2: partida.vitoriasJogador2,
      status: partida.status,
    };
  }
}
