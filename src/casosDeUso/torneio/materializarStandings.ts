import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { StandingsGateway } from "../../dominio/gateway/standingsGateway";
import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { Standings } from "../../dominio/entidade/standings";
import { Torneio } from "../../dominio/entidade/torneio";
import { montarJogadoresStandings } from "./montarStandings";

export type MaterializarStandingsInput = {
  torneio: Torneio;
  /** Rodada consolidada no snapshot (0 = zeros). */
  rodadaConsolidada: number;
};

/**
 * Calcula e persiste snapshot de standings.
 * Usado em iniciarTorneio / iniciarProximaRodada / finalização / backfill.
 */
export class MaterializarStandings {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly usuarioGateway: UsuarioGateway,
    private readonly deckGateway: DeckGateway,
    private readonly timeGateway: TimeGateway,
    private readonly standingsGateway: StandingsGateway
  ) {}

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    partidaGateway: PartidaGateway,
    usuarioGateway: UsuarioGateway,
    deckGateway: DeckGateway,
    timeGateway: TimeGateway,
    standingsGateway: StandingsGateway
  ) {
    return new MaterializarStandings(
      torneioGateway,
      inscricaoGateway,
      partidaGateway,
      usuarioGateway,
      deckGateway,
      timeGateway,
      standingsGateway
    );
  }

  public async executar(input: MaterializarStandingsInput): Promise<Standings> {
    const { torneio, rodadaConsolidada } = input;

    const inscricoes = await this.inscricaoGateway.listarPorTorneio(torneio.id);
    const usuarioIds = inscricoes.map((i) => i.usuarioId);
    const usuarios = await this.usuarioGateway.buscarVarios(usuarioIds);

    const deckIds = inscricoes
      .map((i) => i.deckId)
      .filter((id): id is string => !!id);
    const decks =
      deckIds.length > 0 ? await this.deckGateway.buscarVarios(deckIds) : [];

    const times =
      usuarioIds.length > 0
        ? await this.timeGateway.buscarPorMembros(usuarioIds)
        : [];

    const partidas =
      rodadaConsolidada === 0
        ? []
        : await this.partidaGateway.listarPorTorneio(torneio.id);

    const jogadores = montarJogadoresStandings({
      torneio,
      inscricoes,
      partidas,
      usuarios,
      decks,
      times,
      incluirAteRodada: rodadaConsolidada,
      modoLegadoRodadaAtual: false,
    });

    const snapshot = Standings.criar({
      torneioId: torneio.id,
      rodada: rodadaConsolidada,
      totalInscritos: inscricoes.length,
      jogadores,
    });

    return this.standingsGateway.salvarSnapshot(snapshot);
  }

  /** Materializa a partir do torneioId (carrega torneio). */
  public async executarPorTorneioId(
    torneioId: string,
    rodadaConsolidada: number
  ): Promise<Standings> {
    const torneio = await this.torneioGateway.buscarPorId(torneioId);
    if (!torneio) {
      throw new Error(`Torneio ${torneioId} não encontrado para materializar standings.`);
    }
    return this.executar({ torneio, rodadaConsolidada });
  }
}
