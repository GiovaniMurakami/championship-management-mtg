import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { StandingsGateway } from "../../dominio/gateway/standingsGateway";
import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { StandingJogador } from "../../dominio/entidade/standings";
import { montarJogadoresStandings } from "./montarStandings";
import { MaterializarStandings } from "./materializarStandings";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";

export type BuscarStandingsInputDto = {
  torneioId: string;
  /** Se informado, retorna snapshot histórico daquela rodada. */
  rodada?: number;
};

export type BuscarStandingsOutputDto = {
  torneioId: string;
  rodadaAtual: number;
  /** Rodada consolidada do snapshot retornado. */
  rodadaStandings: number;
  totalRodadas: number;
  status: string;
  totalInscritos: number;
  rodadaIniciadaEm?: string;
  standings: StandingJogador[];
};

/**
 * Lê standings materializados. Não recalcula Swiss no caminho feliz.
 * Fallback:
 * - inscricoes_abertas sem snapshot: monta zeros a partir das inscrições (leve)
 * - em_andamento/finalizado sem snapshot: materializa uma vez (backfill legado) e retorna
 */
export class BuscarStandings
  implements CasoDeUso<BuscarStandingsInputDto, BuscarStandingsOutputDto>
{
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly usuarioGateway: UsuarioGateway,
    private readonly deckGateway: DeckGateway,
    private readonly timeGateway: TimeGateway,
    private readonly standingsGateway: StandingsGateway,
    private readonly materializarStandings: MaterializarStandings
  ) {}

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    partidaGateway: PartidaGateway,
    usuarioGateway: UsuarioGateway,
    deckGateway: DeckGateway,
    timeGateway: TimeGateway,
    standingsGateway: StandingsGateway,
    materializarStandings: MaterializarStandings
  ) {
    return new BuscarStandings(
      torneioGateway,
      inscricaoGateway,
      partidaGateway,
      usuarioGateway,
      deckGateway,
      timeGateway,
      standingsGateway,
      materializarStandings
    );
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

    let snapshot =
      input.rodada !== undefined
        ? await this.standingsGateway.buscarPorTorneioERodada(
            input.torneioId,
            input.rodada
          )
        : await this.standingsGateway.buscarAtual(input.torneioId);

    if (!snapshot && input.rodada !== undefined) {
      throw ErroPersonalizado.criar({
        mensagem: `Standings da rodada ${input.rodada} não encontrados.`,
        status: StatusErro.erroNaoEncontrado,
      });
    }

    // Snapshot desatualizado (ex.: ingresso tardio) — rematerializa se o total mudou.
    if (
      snapshot &&
      input.rodada === undefined &&
      torneio.status !== "inscricoes_abertas"
    ) {
      const totais = await this.inscricaoGateway.contarPorTorneios([
        input.torneioId,
      ]);
      const totalAtual = totais[input.torneioId] ?? 0;
      if (totalAtual !== snapshot.totalInscritos) {
        const rodadaConsolidada =
          torneio.status === "finalizado"
            ? torneio.rodadaAtual
            : Math.max(0, torneio.rodadaAtual - 1);
        snapshot = await this.materializarStandings.executar({
          torneio,
          rodadaConsolidada,
        });
      }
    }

    if (!snapshot) {
      if (torneio.status === "inscricoes_abertas") {
        const inscricoes = await this.inscricaoGateway.listarPorTorneio(
          input.torneioId
        );
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

        const standings = montarJogadoresStandings({
          torneio,
          inscricoes,
          partidas: [],
          usuarios,
          decks,
          times,
          incluirAteRodada: 0,
        });

        return {
          torneioId: torneio.id,
          rodadaAtual: torneio.rodadaAtual,
          rodadaStandings: 0,
          totalRodadas: torneio.totalRodadas,
          status: torneio.status,
          totalInscritos: inscricoes.length,
          rodadaIniciadaEm: toBrasiliaISO(torneio.rodadaIniciadaEm),
          standings,
        };
      }

      // Backfill único para torneios legados sem snapshot
      const rodadaConsolidada =
        torneio.status === "finalizado"
          ? torneio.rodadaAtual
          : Math.max(0, torneio.rodadaAtual - 1);

      snapshot = await this.materializarStandings.executar({
        torneio,
        rodadaConsolidada,
      });
    }

    return {
      torneioId: torneio.id,
      rodadaAtual: torneio.rodadaAtual,
      rodadaStandings: snapshot.rodada,
      totalRodadas: torneio.totalRodadas,
      status: torneio.status,
      totalInscritos: snapshot.totalInscritos,
      rodadaIniciadaEm: toBrasiliaISO(torneio.rodadaIniciadaEm),
      standings: snapshot.jogadores,
    };
  }
}
