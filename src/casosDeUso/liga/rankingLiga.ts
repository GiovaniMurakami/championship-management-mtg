import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type RankingLigaInputDto = {
  ligaId: string;
  limiteJogadores?: number;
  limiteDecks?: number;
  limiteCartas?: number;
};

export type RankingLigaOutputDto = {
  ligaId: string;
  ligaNome: string;
  tipo: "individual" | "times";
  rankingJogadores: {
    posicao: number;
    jogador: { id: string; nome: string };
    vitorias: number;
    derrotas: number;
    empates: number;
    pontos: number;
  }[];
  totalJogadores: number;
  rankingDecks: {
    posicao: number;
    nome: string;
    totalUsos: number;
    vitorias: number;
    derrotas: number;
    empates: number;
    winrate: number;
    loserate: number;
  }[];
  totalDecks: number;
  rankingCartas: {
    posicao: number;
    nome: string;
    totalCopias: number;
    totalDecks: number;
  }[];
  totalCartas: number;
  rankingTimes?: {
    posicao: number;
    time: { id: string; nome: string };
    vitorias: number;
    derrotas: number;
    empates: number;
    pontos: number;
  }[];
  totalTimes?: number;
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
  derrotas: number;
  empates: number;
};

type StatsCarta = {
  totalCopias: number;
  totalDecks: number;
};

type StatsTime = {
  vitorias: number;
  derrotas: number;
  empates: number;
  pontos: number;
};

export class RankingLiga implements CasoDeUso<RankingLigaInputDto, RankingLigaOutputDto> {
  private constructor(
    private readonly ligaGateway: LigaGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly deckGateway: DeckGateway,
    private readonly usuarioGateway: UsuarioGateway,
    private readonly timeGateway: TimeGateway
  ) { }

  public static criar(
    ligaGateway: LigaGateway,
    partidaGateway: PartidaGateway,
    inscricaoGateway: InscricaoGateway,
    deckGateway: DeckGateway,
    usuarioGateway: UsuarioGateway,
    timeGateway: TimeGateway
  ) {
    return new RankingLiga(ligaGateway, partidaGateway, inscricaoGateway, deckGateway, usuarioGateway, timeGateway);
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

    // Batch: busca todas as partidas e inscrições de todos os torneios da liga de uma vez (evita N+1)
    const [todasPartidas, todasInscricoes] = await Promise.all([
      this.partidaGateway.listarPorTorneios(liga.torneioIds),
      this.inscricaoGateway.listarPorTorneios(liga.torneioIds),
    ]);

    // Constrói mapa de deckPorJogador por torneio
    const deckPorTorneioEJogador = new Map<string, Map<string, string>>();
    for (const inscricao of todasInscricoes) {
      if (!deckPorTorneioEJogador.has(inscricao.torneioId)) {
        deckPorTorneioEJogador.set(inscricao.torneioId, new Map());
      }
      if (inscricao.deckId) {
        deckPorTorneioEJogador.get(inscricao.torneioId)!.set(inscricao.usuarioId, inscricao.deckId);
        deckIdsUsados.add(inscricao.deckId);
      }
    }

    for (const partida of todasPartidas) {
      const deckPorJogador = deckPorTorneioEJogador.get(partida.torneioId) ?? new Map<string, string>();
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
        const v1 = partida.vitoriasJogador1;
        const v2 = partida.vitoriasJogador2;
        if (v1 > v2) { stats1.vitorias++; stats1.pontos += 3; }
        else if (v1 === v2 && v1 > 0) { stats1.empates++; stats1.pontos += 1; }
        else { stats1.derrotas++; }
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
        this.registrarUsoDeck(statsDecks, deckId1, v1 > v2 ? "vitoria" : v2 > v1 ? "derrota" : "empate");
      }
      if (deckId2) {
        deckIdsUsados.add(deckId2);
        this.registrarUsoDeck(statsDecks, deckId2, v2 > v1 ? "vitoria" : v1 > v2 ? "derrota" : "empate");
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
        existing.derrotas += stats.derrotas;
        existing.empates += stats.empates;
      } else {
        statsDecksFinal.set(nomeDeck, {
          nome: nomeDeck,
          totalUsos: stats.totalUsos,
          vitorias: stats.vitorias,
          derrotas: stats.derrotas,
          empates: stats.empates,
        });
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

    const limJogadores = input.limiteJogadores ?? 10;
    const limDecks = input.limiteDecks ?? 10;
    const limCartas = input.limiteCartas ?? 10;

    // Ranking jogadores — ordenado por pontos desc, vitorias desc
    const jogadoresOrdenados = Array.from(statsJogadores.entries())
      .sort(([, a], [, b]) => b.pontos - a.pontos || b.vitorias - a.vitorias);

    const rankingJogadores = jogadoresOrdenados
      .slice(0, limJogadores)
      .map(([jogadorId, stats], idx) => ({
        posicao: idx + 1,
        jogador: { id: jogadorId, nome: nomesPorId.get(jogadorId) ?? "Desconhecido" },
        vitorias: stats.vitorias,
        derrotas: stats.derrotas,
        empates: stats.empates,
        pontos: stats.pontos,
      }));

    // Ranking decks — ordenado por totalUsos desc, vitorias desc
    const decksOrdenados = Array.from(statsDecksFinal.values())
      .sort((a, b) => b.totalUsos - a.totalUsos || b.vitorias - a.vitorias);

    const rankingDecks = decksOrdenados
      .slice(0, limDecks)
      .map((stats, idx) => {
        const totalPartidas = stats.vitorias + stats.derrotas + stats.empates;
        return {
          posicao: idx + 1,
          nome: stats.nome,
          totalUsos: stats.totalUsos,
          vitorias: stats.vitorias,
          derrotas: stats.derrotas,
          empates: stats.empates,
          winrate: totalPartidas > 0 ? Math.round((stats.vitorias / totalPartidas) * 1000) / 10 : 0,
          loserate: totalPartidas > 0 ? Math.round((stats.derrotas / totalPartidas) * 1000) / 10 : 0,
        };
      });

    // Ranking cartas — ordenado por totalCopias desc
    const cartasOrdenadas = Array.from(statsCartas.entries())
      .sort(([, a], [, b]) => b.totalCopias - a.totalCopias || b.totalDecks - a.totalDecks);

    const rankingCartas = cartasOrdenadas
      .slice(0, limCartas)
      .map(([nomeCarta, stats], idx) => ({
        posicao: idx + 1,
        nome: nomeCarta,
        totalCopias: stats.totalCopias,
        totalDecks: stats.totalDecks,
      }));

    // Team ranking (only for "times" leagues)
    let rankingTimes: RankingLigaOutputDto["rankingTimes"];
    let totalTimes: number | undefined;

    if (liga.tipo === "times") {
      const statsTimesMap = new Map<string, StatsTime>();

      for (const inscricao of todasInscricoes) {
        if (!inscricao.timeId) continue;
        const jogadorStats = statsJogadores.get(inscricao.usuarioId);
        if (!jogadorStats) continue;

        const existing = statsTimesMap.get(inscricao.timeId);
        if (existing) {
          existing.vitorias += jogadorStats.vitorias;
          existing.derrotas += jogadorStats.derrotas;
          existing.empates += jogadorStats.empates;
          existing.pontos += jogadorStats.pontos;
        } else {
          statsTimesMap.set(inscricao.timeId, {
            vitorias: jogadorStats.vitorias,
            derrotas: jogadorStats.derrotas,
            empates: jogadorStats.empates,
            pontos: jogadorStats.pontos,
          });
        }
      }

      const timeIds = Array.from(statsTimesMap.keys());
      const times = timeIds.length > 0 ? await this.timeGateway.buscarVarios(timeIds) : [];
      const nomesPorTimeId = new Map(times.map((t) => [t.id, t.nome]));

      const limTimes = input.limiteJogadores ?? 10;
      const timesOrdenados = Array.from(statsTimesMap.entries())
        .sort(([, a], [, b]) => b.pontos - a.pontos || b.vitorias - a.vitorias);

      totalTimes = timesOrdenados.length;
      rankingTimes = timesOrdenados
        .slice(0, limTimes)
        .map(([timeId, stats], idx) => ({
          posicao: idx + 1,
          time: { id: timeId, nome: nomesPorTimeId.get(timeId) ?? "Desconhecido" },
          vitorias: stats.vitorias,
          derrotas: stats.derrotas,
          empates: stats.empates,
          pontos: stats.pontos,
        }));
    }

    return {
      ligaId: liga.id,
      ligaNome: liga.nome,
      tipo: liga.tipo,
      rankingJogadores,
      totalJogadores: jogadoresOrdenados.length,
      rankingDecks,
      totalDecks: decksOrdenados.length,
      rankingCartas,
      totalCartas: cartasOrdenadas.length,
      ...(liga.tipo === "times" ? { rankingTimes, totalTimes } : {}),
    };
  }

  private registrarUsoDeck(
    statsDecks: Map<string, StatsDeck>,
    deckId: string,
    resultado: "vitoria" | "derrota" | "empate"
  ): void {
    const existing = statsDecks.get(deckId);
    if (existing) {
      existing.totalUsos++;
      if (resultado === "vitoria") existing.vitorias++;
      else if (resultado === "derrota") existing.derrotas++;
      else existing.empates++;
    } else {
      statsDecks.set(deckId, {
        nome: deckId,
        totalUsos: 1,
        vitorias: resultado === "vitoria" ? 1 : 0,
        derrotas: resultado === "derrota" ? 1 : 0,
        empates: resultado === "empate" ? 1 : 0,
      });
    }
  }
}
