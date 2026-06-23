import { Partida } from "../../dominio/entidade/partida";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import {
  calcularResultadoRankPartida,
  deltasParaJogadores,
  PONTOS_RANK_INICIAL,
  ResultadoRankPartida,
} from "../../dominio/regras/rank";

export type RankPartidaAplicado = {
  partidaId: string;
  vencedorId: string;
  perdedorId: string;
  deltaVencedor: number;
  deltaPerdedor: number;
  rankVencedorAntes: string;
  rankPerdedorAntes: string;
  rankVencedorDepois: string;
  rankPerdedorDepois: string;
  pontosVencedorDepois: number;
  pontosPerdedorDepois: number;
};

export class ProcessarRankPartida {
  private constructor(
    private readonly usuarioGateway: UsuarioGateway,
    private readonly partidaGateway: PartidaGateway
  ) {}

  public static criar(usuarioGateway: UsuarioGateway, partidaGateway: PartidaGateway) {
    return new ProcessarRankPartida(usuarioGateway, partidaGateway);
  }

  public async reverterSeAplicado(partida: Partida): Promise<void> {
    const { rankDeltaJogador1, rankDeltaJogador2, jogador2Id } = partida;
    if (rankDeltaJogador1 === null && rankDeltaJogador2 === null) return;
    if (!jogador2Id) return;

    const alteracoes: Array<{ id: string; delta: number }> = [];
    if (rankDeltaJogador1 !== null) {
      alteracoes.push({ id: partida.jogador1Id, delta: -rankDeltaJogador1 });
    }
    if (rankDeltaJogador2 !== null) {
      alteracoes.push({ id: jogador2Id, delta: -rankDeltaJogador2 });
    }

    await this.usuarioGateway.incrementarPontosRank(alteracoes);
    await this.partidaGateway.atualizarRankDeltas(partida.id, null, null);
    partida.rankDeltaJogador1 = null;
    partida.rankDeltaJogador2 = null;
  }

  public async aplicarParaPartida(partida: Partida): Promise<RankPartidaAplicado | null> {
    if (!partida.jogador2Id || partida.status !== "finalizada") return null;

    await this.reverterSeAplicado(partida);

    const usuarios = await this.usuarioGateway.buscarVarios([
      partida.jogador1Id,
      partida.jogador2Id,
    ]);
    const mapa = new Map(usuarios.map((u) => [u.id, u]));
    const jogador1 = mapa.get(partida.jogador1Id);
    const jogador2 = mapa.get(partida.jogador2Id);
    if (!jogador1 || !jogador2) return null;

    const resultado = calcularResultadoRankPartida({
      jogador1Id: partida.jogador1Id,
      jogador2Id: partida.jogador2Id,
      vitoriasJogador1: partida.vitoriasJogador1,
      vitoriasJogador2: partida.vitoriasJogador2,
      pontosJogador1: jogador1.pontosRank ?? PONTOS_RANK_INICIAL,
      pontosJogador2: jogador2.pontosRank ?? PONTOS_RANK_INICIAL,
    });

    if (!resultado) return null;

    const { deltaJogador1, deltaJogador2 } = deltasParaJogadores(
      partida.jogador1Id,
      partida.jogador2Id,
      resultado
    );

    await this.usuarioGateway.incrementarPontosRank([
      { id: partida.jogador1Id, delta: deltaJogador1 },
      { id: partida.jogador2Id, delta: deltaJogador2 },
    ]);
    await this.partidaGateway.atualizarRankDeltas(
      partida.id,
      deltaJogador1,
      deltaJogador2
    );
    partida.rankDeltaJogador1 = deltaJogador1;
    partida.rankDeltaJogador2 = deltaJogador2;

    return this.mapearResultado(partida.id, resultado);
  }

  public async reverterPartidas(partidas: Partida[]): Promise<void> {
    for (const partida of partidas) {
      await this.reverterSeAplicado(partida);
    }
  }

  private mapearResultado(partidaId: string, resultado: ResultadoRankPartida): RankPartidaAplicado {
    return {
      partidaId,
      vencedorId: resultado.vencedorId,
      perdedorId: resultado.perdedorId,
      deltaVencedor: resultado.deltaVencedor,
      deltaPerdedor: resultado.deltaPerdedor,
      rankVencedorAntes: resultado.rankVencedorAntes,
      rankPerdedorAntes: resultado.rankPerdedorAntes,
      rankVencedorDepois: resultado.rankVencedorDepois,
      rankPerdedorDepois: resultado.rankPerdedorDepois,
      pontosVencedorDepois: resultado.pontosVencedorDepois,
      pontosPerdedorDepois: resultado.pontosPerdedorDepois,
    };
  }
}
