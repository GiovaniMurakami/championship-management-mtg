import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import {
  calcularEstatisticas,
  ordenarPorDesempate,
  mwp,
  omwp,
  gwp,
  ogwp,
} from "./swiss";

export type BuscarStandingsInputDto = {
  torneioId: string;
};

export type BuscarStandingsOutputDto = {
  torneioId: string;
  rodadaAtual: number;
  totalRodadas: number;
  status: string;
  rodadaIniciadaEm?: string;
  standings: Array<{
    posicao: number;
    usuario: { id: string; nome: string };
    pontosMesa: number;
    vitoriasPartida: number;
    empatesPartida: number;
    derrotasPartida: number;
    mwp: number;
    omwp: number;
    gwp: number;
    ogwp: number;
    checkInRodada: number;
    deckId?: string | null;
    deckNome?: string | null;
    dropped: boolean;
  }>;
};

export class BuscarStandings
  implements CasoDeUso<BuscarStandingsInputDto, BuscarStandingsOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly usuarioGateway: UsuarioGateway,
    private readonly deckGateway: DeckGateway
  ) { }

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    partidaGateway: PartidaGateway,
    usuarioGateway: UsuarioGateway,
    deckGateway: DeckGateway
  ) {
    return new BuscarStandings(torneioGateway, inscricaoGateway, partidaGateway, usuarioGateway, deckGateway);
  }

  public async executar(
    input: BuscarStandingsInputDto
  ): Promise<BuscarStandingsOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const toBrasiliaISO = (date?: Date): string | undefined => {
      if (!date) return undefined;
      const offset = -3 * 60;
      const local = new Date(date.getTime() + offset * 60 * 1000);
      return local.toISOString().replace("Z", "-03:00");
    };

    const inscricoes = await this.inscricaoGateway.listarPorTorneio(
      input.torneioId
    );

    const usuarioIds = inscricoes.map((i) => i.usuarioId);
    const usuarios = await this.usuarioGateway.buscarVarios(usuarioIds);
    const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));

    const deckIds = inscricoes
      .map((i) => i.deckId)
      .filter((id): id is string => !!id);
    const decks = deckIds.length > 0
      ? await this.deckGateway.buscarVarios(deckIds)
      : [];
    const deckMap = new Map(decks.map((d) => [d.id, d]));

    if (torneio.status === "inscricoes_abertas" || torneio.rodadaAtual <= 1) {
      const standings = inscricoes.map((i, idx) => ({
        posicao: idx + 1,
        usuario: { id: i.usuarioId, nome: usuarioMap.get(i.usuarioId)?.nome ?? i.usuarioId },
        pontosMesa: 0,
        vitoriasPartida: 0,
        empatesPartida: 0,
        derrotasPartida: 0,
        mwp: 0,
        omwp: 0,
        gwp: 0,
        ogwp: 0,
        checkInRodada: i.checkInRodada,
        deckId: i.deckId ?? null,
        deckNome: i.deckId ? (deckMap.get(i.deckId)?.nomeConsolidado || deckMap.get(i.deckId)?.nome || null) : null,
        dropped: i.dropped,
      }));

      return {
        torneioId: torneio.id,
        rodadaAtual: torneio.rodadaAtual,
        totalRodadas: torneio.totalRodadas,
        status: torneio.status,
        rodadaIniciadaEm: toBrasiliaISO(torneio.rodadaIniciadaEm),
        standings,
      };
    }

    const todasPartidas = await this.partidaGateway.listarPorTorneio(
      input.torneioId
    );

    const partidasConsolidadas = torneio.status === "finalizado"
      ? todasPartidas
      : todasPartidas.filter((p) => p.rodada < torneio.rodadaAtual);

    // Incluir TODOS os jogadores com check-in E todos que possuem histórico de partidas
    // para que omwp/ogwp use o MWP real de oponentes dropados
    const jogadoresComCheckIn = inscricoes
      .filter((i) => i.checkInRodada >= 0)
      .map((i) => i.usuarioId);

    const idsComHistorico = Array.from(
      new Set(
        todasPartidas.flatMap((p) => [
          p.jogador1Id,
          ...(p.jogador2Id ? [p.jogador2Id] : []),
        ])
      )
    );

    const jogadoresIds = Array.from(new Set([...jogadoresComCheckIn, ...idsComHistorico]));

    const inscricaoMap = new Map(inscricoes.map((i) => [i.usuarioId, i]));

    const statsMap = calcularEstatisticas(jogadoresIds, partidasConsolidadas);
    const ordenados = ordenarPorDesempate(
      Array.from(statsMap.values()),
      statsMap
    );

    return {
      torneioId: torneio.id,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
      status: torneio.status,
      rodadaIniciadaEm: toBrasiliaISO(torneio.rodadaIniciadaEm),
      standings: ordenados.map((s, idx) => {
        const inscricao = inscricaoMap.get(s.usuarioId);
        return {
          posicao: idx + 1,
          usuario: { id: s.usuarioId, nome: usuarioMap.get(s.usuarioId)?.nome ?? s.usuarioId },
          pontosMesa: s.pontosMesa,
          vitoriasPartida: s.vitoriasPartida,
          empatesPartida: s.empatesPartida,
          derrotasPartida: s.derrotasPartida,
          mwp: mwp(s),
          omwp: omwp(s, statsMap),
          gwp: gwp(s),
          ogwp: ogwp(s, statsMap),
          checkInRodada: inscricao?.checkInRodada ?? -1,
          deckId: inscricao?.deckId ?? null,
          deckNome: inscricao?.deckId
            ? (deckMap.get(inscricao.deckId)?.nomeConsolidado || deckMap.get(inscricao.deckId)?.nome || null)
            : null,
          dropped: inscricao?.dropped ?? false,
        };
      }),
    };
  }
}
