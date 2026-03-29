import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type RankingLigaInputDto = {
  ligaId: string;
};

export type RankingLigaOutputDto = {
  ligaId: string;
  ligaNome: string;
  rankingJogadores: {
    posicao: number;
    jogador: { id: string; nome: string };
    vitorias: number;
    derrotas: number;
    empates: number;
    pontos: number;
  }[];
  rankingDecks: {
    posicao: number;
    nome: string;
    totalUsos: number;
    vitorias: number;
  }[];
  rankingCartas: {
    posicao: number;
    nome: string;
    totalCopias: number;
    totalDecks: number;
  }[];
};

type StatsJogador = {
  vitorias: number;
  derrotas: number;
  empates: number;
  pontos: number;
};

type StatsDeck = {
  nome: string;
  totalUsos: number;
  vitorias: number;
};

type StatsCarta = {
  totalCopias: number;
  totalDecks: number;
};

export class RankingLiga implements CasoDeUso<RankingLigaInputDto, RankingLigaOutputDto> {
  private constructor(
    private readonly ligaGateway: LigaGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly deckGateway: DeckGateway,
    private readonly usuarioGateway: UsuarioGateway
  ) {}

  public static criar(
    ligaGateway: LigaGateway,
    partidaGateway: PartidaGateway,
    inscricaoGateway: InscricaoGateway,
    deckGateway: DeckGateway,
    usuarioGateway: UsuarioGateway
  ) {
    return new RankingLiga(ligaGateway, partidaGateway, inscricaoGateway, deckGateway, usuarioGateway);
  }

  public async executar(input: RankingLigaInputDto): Promise<RankingLigaOutputDto> {
    const liga = await this.ligaGateway.buscarPorId(input.ligaId);

    if (!liga) {
      throw ErroPersonalizado.criar({
        mensagem: "Liga não encontrada.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const statsJogadores = new Map<string, StatsJogador>();
    const statsDecks = new Map<string, StatsDeck>();
    const statsCartas = new Map<string, StatsCarta>();
    const deckIdsUsados = new Set<string>();

    // Coleta todas as partidas finalizadas e inscrições de todos os torneios da liga
    for (const torneioId of liga.torneioIds) {
      const [partidas, inscricoes] = await Promise.all([
        this.partidaGateway.listarPorTorneio(torneioId),
        this.inscricaoGateway.listarPorTorneio(torneioId),
      ]);

      // Mapa de jogadorId → deckId para o torneio
      const deckPorJogador = new Map<string, string>();
      for (const inscricao of inscricoes) {
        if (inscricao.deckId) {
          deckPorJogador.set(inscricao.usuarioId, inscricao.deckId);
          deckIdsUsados.add(inscricao.deckId);
        }
      }

      for (const partida of partidas) {
        if (partida.status !== "finalizada") continue;

        // Ignora byes (jogador2Id null)
        const isBye = partida.jogador2Id === null;

        const jogador1Id = partida.jogador1Id;
        const jogador2Id = partida.jogador2Id;

        if (!statsJogadores.has(jogador1Id)) {
          statsJogadores.set(jogador1Id, { vitorias: 0, derrotas: 0, empates: 0, pontos: 0 });
        }
        if (!isBye && jogador2Id && !statsJogadores.has(jogador2Id)) {
          statsJogadores.set(jogador2Id, { vitorias: 0, derrotas: 0, empates: 0, pontos: 0 });
        }

        const stats1 = statsJogadores.get(jogador1Id)!;

        if (isBye) {
          // Bye conta como vitória para o jogador1
          stats1.vitorias++;
          stats1.pontos += 3;
          continue;
        }

        const stats2 = statsJogadores.get(jogador2Id!)!;
        const v1 = partida.vitoriasJogador1;
        const v2 = partida.vitoriasJogador2;

        if (v1 > v2) {
          stats1.vitorias++;
          stats1.pontos += 3;
          stats2.derrotas++;
        } else if (v2 > v1) {
          stats2.vitorias++;
          stats2.pontos += 3;
          stats1.derrotas++;
        } else {
          stats1.empates++;
          stats1.pontos += 1;
          stats2.empates++;
          stats2.pontos += 1;
        }

        // Stats de decks por resultado
        const deckId1 = partida.deckJogador1Id ?? deckPorJogador.get(jogador1Id);
        const deckId2 = partida.deckJogador2Id ?? deckPorJogador.get(jogador2Id!);

        if (deckId1) {
          deckIdsUsados.add(deckId1);
          this.registrarUsoDeck(statsDecks, deckId1, v1 > v2);
        }
        if (deckId2) {
          deckIdsUsados.add(deckId2);
          this.registrarUsoDeck(statsDecks, deckId2, v2 > v1);
        }
      }
    }

    // Busca todos os decks usados para nomes e cartas
    const deckIds = Array.from(deckIdsUsados);
    const decks = deckIds.length > 0 ? await this.deckGateway.buscarVarios(deckIds) : [];
    const deckPorId = new Map(decks.map((d) => [d.id, d]));

    // Renomeia stats de decks: de deckId → nome consolidado (ou nome)
    const statsDecksFinal = new Map<string, StatsDeck>();
    for (const [deckId, stats] of statsDecks.entries()) {
      const deck = deckPorId.get(deckId);
      const nomeDeck = deck?.nomeConsolidado ?? deck?.nome ?? deckId;
      const existing = statsDecksFinal.get(nomeDeck);
      if (existing) {
        existing.totalUsos += stats.totalUsos;
        existing.vitorias += stats.vitorias;
      } else {
        statsDecksFinal.set(nomeDeck, { nome: nomeDeck, totalUsos: stats.totalUsos, vitorias: stats.vitorias });
      }
    }

    // Cartas mais utilizadas (maindeck de todos os decks usados na liga)
    for (const deck of decks) {
      for (const carta of deck.maindeck) {
        const nomeCarta = carta.nome;
        const existing = statsCartas.get(nomeCarta);
        if (existing) {
          existing.totalCopias += carta.quantidade;
          existing.totalDecks++;
        } else {
          statsCartas.set(nomeCarta, { totalCopias: carta.quantidade, totalDecks: 1 });
        }
      }
    }

    // Busca nomes dos jogadores
    const jogadorIds = Array.from(statsJogadores.keys());
    const usuarios = jogadorIds.length > 0 ? await this.usuarioGateway.buscarVarios(jogadorIds) : [];
    const nomesPorId = new Map(usuarios.map((u) => [u.id, u.nome]));

    // Ranking jogadores — ordenado por pontos desc, vitorias desc
    const rankingJogadores = Array.from(statsJogadores.entries())
      .sort(([, a], [, b]) => b.pontos - a.pontos || b.vitorias - a.vitorias)
      .map(([jogadorId, stats], idx) => ({
        posicao: idx + 1,
        jogador: { id: jogadorId, nome: nomesPorId.get(jogadorId) ?? "Desconhecido" },
        vitorias: stats.vitorias,
        derrotas: stats.derrotas,
        empates: stats.empates,
        pontos: stats.pontos,
      }));

    // Ranking decks — ordenado por totalUsos desc, vitorias desc
    const rankingDecks = Array.from(statsDecksFinal.values())
      .sort((a, b) => b.totalUsos - a.totalUsos || b.vitorias - a.vitorias)
      .map((stats, idx) => ({
        posicao: idx + 1,
        nome: stats.nome,
        totalUsos: stats.totalUsos,
        vitorias: stats.vitorias,
      }));

    // Ranking cartas — ordenado por totalCopias desc (top 50)
    const rankingCartas = Array.from(statsCartas.entries())
      .sort(([, a], [, b]) => b.totalCopias - a.totalCopias || b.totalDecks - a.totalDecks)
      .slice(0, 50)
      .map(([nomeCarta, stats], idx) => ({
        posicao: idx + 1,
        nome: nomeCarta,
        totalCopias: stats.totalCopias,
        totalDecks: stats.totalDecks,
      }));

    return {
      ligaId: liga.id,
      ligaNome: liga.nome,
      rankingJogadores,
      rankingDecks,
      rankingCartas,
    };
  }

  private registrarUsoDeck(
    statsDecks: Map<string, StatsDeck>,
    deckId: string,
    ganhou: boolean
  ): void {
    const existing = statsDecks.get(deckId);
    if (existing) {
      existing.totalUsos++;
      if (ganhou) existing.vitorias++;
    } else {
      statsDecks.set(deckId, { nome: deckId, totalUsos: 1, vitorias: ganhou ? 1 : 0 });
    }
  }
}
