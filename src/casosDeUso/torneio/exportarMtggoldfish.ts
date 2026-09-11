import { Carta } from "../../dominio/entidade/deck";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { buildFrontendAppLink } from "../../helpers/env";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { resolverNomeJogador } from "../../helpers/torneio/resolverNomeJogador";
import { CasoDeUso } from "../casoDeUso";
import { BuscarStandings } from "./buscarStandings";

type ExportedCard = {
  count: number;
  cardName: string;
};

export type ExportarMtggoldfishInputDto = {
  torneioId: string;
};

export type ExportarMtggoldfishOutputDto = {
  provider: "mtggoldfish";
  generatedAt: string;
  tournament: {
    id: string;
    name: string;
    date: string;
    format: string;
    status: string;
    players: number;
    decklists: number;
    sourceUrl: string;
  };
  warnings: string[];
  decklists: Array<{
    rank: number;
    player: {
      id: string;
      name: string;
      mtgoUsername: string | null;
      arenaUsername: string | null;
    };
    result: string;
    points: number;
    tiebreakers: {
      mwp: number;
      omwp: number;
      gwp: number;
      ogwp: number;
    };
    deck: {
      id: string;
      name: string;
      archetype: string | null;
      format: string;
      mainboard: ExportedCard[];
      sideboard: ExportedCard[];
      commander: ExportedCard[];
      sourceUrl: string;
    };
  }>;
  submissionText: string;
};

function formatRecord(wins: number, losses: number, draws: number): string {
  return draws > 0 ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`;
}

function formatDeckSection(title: string, cards: Carta[]): string[] {
  if (!cards.length) return [];
  return [
    title,
    ...cards.map((card) => `${card.quantidade} ${card.nome}`),
  ];
}

function toExportedCards(cards: Carta[]): ExportedCard[] {
  return cards.map((card) => ({
    count: card.quantidade,
    cardName: card.nome,
  }));
}

function buildDeckText(deck: { mainboard: ExportedCard[]; sideboard: ExportedCard[]; commander: ExportedCard[] }): string[] {
  const toCartas = (cards: ExportedCard[]): Carta[] => cards.map((card) => ({
    quantidade: card.count,
    nome: card.cardName,
  }));

  return [
    ...formatDeckSection("Mainboard", toCartas(deck.mainboard)),
    "",
    ...formatDeckSection("Sideboard", toCartas(deck.sideboard)),
    ...(deck.commander.length ? ["", ...formatDeckSection("Commander", toCartas(deck.commander))] : []),
  ].filter((line, index, lines) => line !== "" || lines[index - 1] !== "");
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/gi, "c")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class ExportarMtggoldfish implements CasoDeUso<ExportarMtggoldfishInputDto, ExportarMtggoldfishOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly usuarioGateway: UsuarioGateway,
    private readonly deckGateway: DeckGateway,
    private readonly buscarStandings: BuscarStandings
  ) {}

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    usuarioGateway: UsuarioGateway,
    deckGateway: DeckGateway,
    buscarStandings: BuscarStandings
  ) {
    return new ExportarMtggoldfish(
      torneioGateway,
      inscricaoGateway,
      usuarioGateway,
      deckGateway,
      buscarStandings
    );
  }

  public async executar(input: ExportarMtggoldfishInputDto): Promise<ExportarMtggoldfishOutputDto> {
    let torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio && /^[a-z0-9]{5}-/.test(input.torneioId)) {
      torneio = await this.torneioGateway.buscarPorPrefixo(input.torneioId.slice(0, 5));
    }

    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (torneio.secreto) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio secreto não pode ser exportado para listagem pública.",
        status: StatusErro.erroProibido,
      });
    }

    if (torneio.status !== "finalizado") {
      throw ErroPersonalizado.criar({
        mensagem: "A exportação MTGGoldfish fica disponível apenas após o torneio ser finalizado.",
        status: StatusErro.erroParametro,
      });
    }

    const [standings, inscricoes] = await Promise.all([
      this.buscarStandings.executar({ torneioId: torneio.id }),
      this.inscricaoGateway.listarPorTorneio(torneio.id),
    ]);

    const usuarioIds = Array.from(new Set(inscricoes.map((inscricao) => inscricao.usuarioId)));
    const deckIds = Array.from(new Set(inscricoes.map((inscricao) => inscricao.deckId).filter((id): id is string => Boolean(id))));
    const [usuarios, decks] = await Promise.all([
      usuarioIds.length ? this.usuarioGateway.buscarVarios(usuarioIds) : [],
      deckIds.length ? this.deckGateway.buscarVarios(deckIds) : [],
    ]);

    const usuarioMap = new Map(usuarios.map((usuario) => [usuario.id, usuario]));
    const deckMap = new Map(decks.map((deck) => [deck.id, deck]));
    const inscricaoPorUsuario = new Map(inscricoes.map((inscricao) => [inscricao.usuarioId, inscricao]));
    const warnings: string[] = [];
    const sourceUrl = buildFrontendAppLink(`/torneios/${torneio.id.slice(0, 5)}-${slugify(torneio.nome || "torneio")}`);

    const decklists = standings.standings.flatMap((standing) => {
      const inscricao = inscricaoPorUsuario.get(standing.usuario.id);
      const deckId = inscricao?.deckId;
      const deck = deckId ? deckMap.get(deckId) : null;
      const usuario = usuarioMap.get(standing.usuario.id);

      if (!deck) {
        warnings.push(`Sem deck exportavel para ${standing.usuario.nome} (#${standing.posicao}).`);
        return [];
      }

      return [{
        rank: standing.posicao,
        player: {
          id: standing.usuario.id,
          name: usuario ? resolverNomeJogador(usuario, torneio.exibirNomeJogador) : standing.usuario.nome,
          mtgoUsername: usuario?.nickMTGO ?? null,
          arenaUsername: usuario?.nickArena ?? null,
        },
        result: formatRecord(
          standing.vitoriasPartida,
          standing.derrotasPartida,
          standing.empatesPartida
        ),
        points: standing.pontosMesa,
        tiebreakers: {
          mwp: standing.mwp,
          omwp: standing.omwp,
          gwp: standing.gwp,
          ogwp: standing.ogwp,
        },
        deck: {
          id: deck.id,
          name: deck.nome,
          archetype: deck.nomeConsolidado || null,
          format: deck.formato,
          mainboard: toExportedCards(deck.maindeck),
          sideboard: toExportedCards(deck.sideboard),
          commander: toExportedCards(deck.commander),
          sourceUrl,
        },
      }];
    });

    const tournament = {
      id: torneio.id,
      name: torneio.nome,
      date: toBrasiliaISO(torneio.horario)!,
      format: torneio.formato,
      status: torneio.status,
      players: standings.totalInscritos,
      decklists: decklists.length,
      sourceUrl,
    };

    const submissionText = [
      `Tournament: ${tournament.name}`,
      `Date: ${tournament.date}`,
      `Format: ${tournament.format}`,
      `Players: ${tournament.players}`,
      `Source: ${tournament.sourceUrl}`,
      "",
      ...decklists.flatMap((entry) => [
        `#${entry.rank} ${entry.player.name} - ${entry.deck.archetype || entry.deck.name} (${entry.result})`,
        ...buildDeckText(entry.deck),
        "",
      ]),
    ].join("\n").trim();

    return {
      provider: "mtggoldfish",
      generatedAt: toBrasiliaISO(new Date())!,
      tournament,
      warnings,
      decklists,
      submissionText,
    };
  }
}
