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
  standings: Array<{
    posicao: number;
    usuarioId: string;
    nome: string;
    pontosMesa: number;
    vitoriasPartida: number;
    empatesPartida: number;
    derrotasPartida: number;
    mwp: number;
    omwp: number;
    gwp: number;
    ogwp: number;
    checkIn: boolean;
    deckId?: string | null;
    deckNome?: string | null;
    checkInProximaRodada: boolean;
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

    if (torneio.status === "inscricoes_abertas" || torneio.rodadaAtual === 0) {
      const standings = inscricoes.map((i, idx) => ({
        posicao: idx + 1,
        usuarioId: i.usuarioId,
        nome: usuarioMap.get(i.usuarioId)?.nome ?? i.usuarioId,
        pontosMesa: 0,
        vitoriasPartida: 0,
        empatesPartida: 0,
        derrotasPartida: 0,
        mwp: 0,
        omwp: 0,
        gwp: 0,
        ogwp: 0,
        checkIn: i.checkIn,
        deckId: i.deckId ?? null,
        deckNome: i.deckId ? (deckMap.get(i.deckId)?.nome ?? null) : null,
        checkInProximaRodada: i.checkIn,
        dropped: i.dropped,
      }));

      return {
        torneioId: torneio.id,
        rodadaAtual: torneio.rodadaAtual,
        totalRodadas: torneio.totalRodadas,
        status: torneio.status,
        standings,
      };
    }

    const todasPartidas = await this.partidaGateway.listarPorTorneio(
      input.torneioId
    );

    const jogadoresIds = inscricoes
      .filter((i) => i.checkIn)
      .map((i) => i.usuarioId);

    const inscricaoMap = new Map(inscricoes.map((i) => [i.usuarioId, i]));

    const statsMap = calcularEstatisticas(jogadoresIds, todasPartidas);
    const ordenados = ordenarPorDesempate(
      Array.from(statsMap.values()),
      statsMap
    );

    return {
      torneioId: torneio.id,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
      status: torneio.status,
      standings: ordenados.map((s, idx) => {
        const inscricao = inscricaoMap.get(s.usuarioId);
        return {
          posicao: idx + 1,
          usuarioId: s.usuarioId,
          nome: usuarioMap.get(s.usuarioId)?.nome ?? s.usuarioId,
          pontosMesa: s.pontosMesa,
          vitoriasPartida: s.vitoriasPartida,
          empatesPartida: s.empatesPartida,
          derrotasPartida: s.derrotasPartida,
          mwp: mwp(s),
          omwp: omwp(s, statsMap),
          gwp: gwp(s),
          ogwp: ogwp(s, statsMap),
          checkIn: inscricao?.checkIn ?? false,
          deckId: inscricao?.deckId ?? null,
          deckNome: inscricao?.deckId
            ? (deckMap.get(inscricao.deckId)?.nome ?? null)
            : null,
          checkInProximaRodada:
            (inscricao?.checkInRodada ?? -1) >= torneio.rodadaAtual,
          dropped: inscricao?.dropped ?? false,
        };
      }),
    };
  }
}
