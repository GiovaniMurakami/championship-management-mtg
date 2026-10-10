import { Deck } from "../../dominio/entidade/deck";
import { Inscricao } from "../../dominio/entidade/inscricao";
import { Partida } from "../../dominio/entidade/partida";
import { Torneio } from "../../dominio/entidade/torneio";
import { Usuario } from "../../dominio/entidade/usuario";
import { normalizarFormatoDeck } from "../../dominio/regras/formatoDeck";
import { toUsuarioPublico } from "../../helpers/torneio/resolverNomeJogador";
import { calcularEstatisticas, ordenarPorDesempate } from "../../dominio/torneio/swiss";
import { coresDoArquetipo } from "../../helpers/deck/coresDeck";

export const DIAS_METAGAME = [7, 14, 30, 90] as const;
export type DiasMetagame = (typeof DIAS_METAGAME)[number];

export const NOME_OUTROS = "Outros";
export const SLUG_OUTROS = "outros";

const TERRENOS_BASICOS = new Set([
  "plains",
  "island",
  "swamp",
  "mountain",
  "forest",
  "wastes",
  "snow-covered plains",
  "snow-covered island",
  "snow-covered swamp",
  "snow-covered mountain",
  "snow-covered forest",
]);

export type CartaQuantidade = { nome: string; quantidade: number };

export type ArquetipoResumo = {
  nome: string;
  slug: string;
  copias: number;
  metaPct: number;
  vitorias: number;
  derrotas: number;
  empates: number;
  winrate: number;
  cartaRepresentativa: string | null;
  cartasChave: string[];
  cartasCores: string[];
  cores: string[];
};

export type RecenteDeck = {
  slug: string;
  nome: string;
  colocacao: number;
  vitorias: number;
  derrotas: number;
  empates: number;
  usuario: { id: string; nome: string; excluido: boolean };
};

export type RecenteTorneio = {
  torneioId: string;
  torneioNome: string;
  horario: string;
  decks: RecenteDeck[];
};

const LIMITE_CARTAS_CHAVE = 3;
const LIMITE_TORNEIOS_RECENTES = 2;
const LIMITE_DECKS_RECENTES = 8;

export type ArquetipoDetalhe = ArquetipoResumo & {
  listaTipica: {
    maindeck: CartaQuantidade[];
    sideboard: CartaQuantidade[];
    commander: CartaQuantidade[];
  };
  listas: Array<{
    deckId: string;
    nome: string;
    nomeConsolidado: string | null;
    usuario: { id: string; nome: string; excluido: boolean };
    torneioId: string;
    torneioNome: string;
    maindeck: CartaQuantidade[];
    sideboard: CartaQuantidade[];
    commander: CartaQuantidade[];
  }>;
  matchups: Array<{
    nome: string;
    slug: string;
    vitorias: number;
    derrotas: number;
    empates: number;
    winrate: number;
    partidas: number;
  }>;
  resultados: Array<{
    torneioId: string;
    torneioNome: string;
    horario: string;
    usuario: { id: string; nome: string; excluido: boolean };
    colocacao: number;
    vitorias: number;
    derrotas: number;
    empates: number;
    deckId: string;
  }>;
};

export type MetagameAgregado = {
  formato: string;
  dias: number;
  totalDecks: number;
  totalTorneios: number;
  arquetipos: ArquetipoResumo[];
  recentes: RecenteTorneio[];
  porSlug: Map<string, ArquetipoDetalhe>;
};

export type AgregarMetagameInput = {
  formato: string;
  dias: number;
  /** Inclui torneios que ainda não estão finalizados (ex.: Day 1 encerrado). */
  permitirNaoFinalizados?: boolean;
  agora: Date;
  intervalo?: { dataInicio: Date; dataFim: Date };
  torneios: Torneio[];
  inscricoes: Inscricao[];
  partidas: Partida[];
  decks: Deck[];
  usuarios: Usuario[];
  /** Overrides de carta representativa por arquétipo (`formato#slug` → carta). */
  overridesCartasRepresentativas?: Record<string, string>;
  /** Inclui torneios secretos (ex.: breakdown por id direto). */
  permitirSecretos?: boolean;
};

export function chaveCartaRepresentativaMetagame(formato: string, slug: string): string {
  return `${formato}#${slug}`;
}

type StatsWL = { vitorias: number; derrotas: number; empates: number };

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function winrateDe(stats: StatsWL): number {
  const total = stats.vitorias + stats.derrotas + stats.empates;
  if (total === 0) return 0;
  return round1((stats.vitorias / total) * 100);
}

export function slugificarArquetipo(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || SLUG_OUTROS;
}

export function ehDiasMetagame(valor: number): valor is DiasMetagame {
  return (DIAS_METAGAME as readonly number[]).includes(valor);
}

function nomeArquetipo(deck: Deck | undefined): string {
  const consolidado = deck?.nomeConsolidado?.trim();
  if (consolidado) return consolidado;
  const nome = deck?.nome?.trim();
  return nome || NOME_OUTROS;
}

/** Chave de agrupamento case-insensitive (ex.: "Blue Terror" ≡ "blue terror"). */
export function chaveNomeArquetipo(nome: string): string {
  return nome.trim().toLocaleLowerCase("pt-BR");
}

/** Escolhe o casing mais frequente; empate → ordem alfabética. */
export function escolherNomeCanonico(variantes: Iterable<string>): string {
  const contagem = new Map<string, number>();
  for (const variante of variantes) {
    contagem.set(variante, (contagem.get(variante) ?? 0) + 1);
  }
  const ordenados = [...contagem.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")
  );
  return ordenados[0]?.[0] ?? NOME_OUTROS;
}

function mapaSlugs(nomes: string[]): Map<string, string> {
  const ordenados = [...new Set(nomes)].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const usados = new Map<string, number>();
  const resultado = new Map<string, string>();
  for (const nome of ordenados) {
    const base = chaveNomeArquetipo(nome) === chaveNomeArquetipo(NOME_OUTROS)
      ? SLUG_OUTROS
      : slugificarArquetipo(nome);
    const n = (usados.get(base) ?? 0) + 1;
    usados.set(base, n);
    resultado.set(nome, n === 1 ? base : `${base}-${n}`);
  }
  return resultado;
}

function cartasDoCampo(
  deck: Deck | undefined,
  campo: "maindeck" | "sideboard" | "commander"
): CartaQuantidade[] {
  if (!deck) return [];
  return (deck[campo] ?? [])
    .filter((carta) => Boolean(carta.nome))
    .map((carta) => ({ nome: carta.nome, quantidade: carta.quantidade }));
}

function contarCartasChave(decks: Deck[], formato: string): Array<[string, number]> {
  const chave = normalizarFormatoDeck(formato);
  const contagem = new Map<string, number>();

  if (chave === "commander" || chave === "commander500") {
    for (const deck of decks) {
      for (const carta of deck.commander ?? []) {
        if (!carta.nome) continue;
        contagem.set(carta.nome, (contagem.get(carta.nome) ?? 0) + carta.quantidade);
      }
    }
  } else {
    for (const deck of decks) {
      for (const carta of deck.maindeck) {
        if (!carta.nome || TERRENOS_BASICOS.has(carta.nome)) continue;
        contagem.set(carta.nome, (contagem.get(carta.nome) ?? 0) + carta.quantidade);
      }
    }
  }

  return [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function cartaRepresentativa(
  decks: Deck[],
  formato: string,
  override?: string | null
): string | null {
  const overrideTrim = override?.trim();
  if (overrideTrim) return overrideTrim;

  const votos = new Map<string, number>();
  for (const deck of decks) {
    const escolhida = deck.cartaRepresentativa?.trim();
    if (!escolhida) continue;
    votos.set(escolhida, (votos.get(escolhida) ?? 0) + 1);
  }
  if (votos.size > 0) {
    return [...votos.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  }
  return contarCartasChave(decks, formato)[0]?.[0] ?? null;
}

function cartasChave(decks: Deck[], formato: string): string[] {
  return contarCartasChave(decks, formato)
    .slice(0, LIMITE_CARTAS_CHAVE)
    .map(([nome]) => nome);
}

function resultadoPartida(v1: number, v2: number): "vitoria" | "derrota" | "empate" {
  if (v1 > v2) return "vitoria";
  if (v2 > v1) return "derrota";
  return "empate";
}

function registrar(stats: StatsWL, resultado: "vitoria" | "derrota" | "empate"): void {
  if (resultado === "vitoria") stats.vitorias += 1;
  else if (resultado === "derrota") stats.derrotas += 1;
  else stats.empates += 1;
}

function inverter(resultado: "vitoria" | "derrota" | "empate"): "vitoria" | "derrota" | "empate" {
  if (resultado === "vitoria") return "derrota";
  if (resultado === "derrota") return "vitoria";
  return "empate";
}

export function agregarMetagame(input: AgregarMetagameInput): MetagameAgregado {
  const formato = normalizarFormatoDeck(input.formato);
  const inicio = input.intervalo?.dataInicio ?? new Date(input.agora.getTime() - input.dias * 24 * 60 * 60 * 1000);

  const torneios = input.torneios.filter((t) => {
    if (!input.permitirNaoFinalizados && t.status !== "finalizado") return false;
    if (t.secreto && !input.permitirSecretos) return false;
    if (normalizarFormatoDeck(t.formato) !== formato) return false;
    return t.horario.getTime() >= inicio.getTime() && (!input.intervalo || t.horario.getTime() <= input.intervalo.dataFim.getTime());
  });
  const torneioIds = new Set(torneios.map((t) => t.id));
  const torneioPorId = new Map(torneios.map((t) => [t.id, t]));

  const decksPorId = new Map(input.decks.map((d) => [d.id, d]));
  const usuarioPorId = new Map(input.usuarios.map((u) => [u.id, u]));

  const inscricoes = input.inscricoes.filter(
    (i) => torneioIds.has(i.torneioId) && i.deckId && decksPorId.has(i.deckId)
  );

  const copias: Array<{
    inscricao: Inscricao;
    deck: Deck;
    chave: string;
    nomeBruto: string;
  }> = [];

  for (const inscricao of inscricoes) {
    const deck = decksPorId.get(inscricao.deckId!)!;
    const nomeBruto = nomeArquetipo(deck);
    copias.push({
      inscricao,
      deck,
      chave: chaveNomeArquetipo(nomeBruto),
      nomeBruto,
    });
  }

  const variantesPorChave = new Map<string, string[]>();
  for (const copia of copias) {
    const lista = variantesPorChave.get(copia.chave) ?? [];
    lista.push(copia.nomeBruto);
    variantesPorChave.set(copia.chave, lista);
  }
  const nomePorChave = new Map<string, string>();
  for (const [chave, variantes] of variantesPorChave) {
    nomePorChave.set(chave, escolherNomeCanonico(variantes));
  }

  const slugsPorNome = mapaSlugs([...nomePorChave.values()]);
  const slugs = new Map<string, string>();
  for (const [chave, nome] of nomePorChave) {
    slugs.set(chave, slugsPorNome.get(nome)!);
  }

  const deckPorJogadorTorneio = new Map<string, string>();
  for (const { inscricao } of copias) {
    deckPorJogadorTorneio.set(`${inscricao.torneioId}:${inscricao.usuarioId}`, inscricao.deckId!);
  }

  const resolverChave = (torneioId: string, jogadorId: string, deckIdPartida?: string | null) => {
    const deckId = deckIdPartida || deckPorJogadorTorneio.get(`${torneioId}:${jogadorId}`);
    if (!deckId) return null;
    const deck = decksPorId.get(deckId);
    if (!deck) return null;
    return chaveNomeArquetipo(nomeArquetipo(deck));
  };

  const statsPorChave = new Map<string, StatsWL>();
  const matchupPorPar = new Map<string, StatsWL>();
  const garantir = (chave: string) => {
    if (!statsPorChave.has(chave)) statsPorChave.set(chave, { vitorias: 0, derrotas: 0, empates: 0 });
    return statsPorChave.get(chave)!;
  };
  for (const chave of nomePorChave.keys()) garantir(chave);

  const partidasValidas = input.partidas.filter(
    (p) => torneioIds.has(p.torneioId) && p.status === "finalizada" && p.jogador2Id
  );

  for (const partida of partidasValidas) {
    const chave1 = resolverChave(partida.torneioId, partida.jogador1Id, partida.deckJogador1Id);
    const chave2 = resolverChave(partida.torneioId, partida.jogador2Id!, partida.deckJogador2Id);
    if (!chave1 || !chave2) continue;

    const resultado = resultadoPartida(partida.vitoriasJogador1, partida.vitoriasJogador2);
    registrar(garantir(chave1), resultado);
    registrar(garantir(chave2), inverter(resultado));

    if (chave1 !== chave2) {
      const chavePar = [chave1, chave2].sort().join("\0");
      if (!matchupPorPar.has(chavePar)) matchupPorPar.set(chavePar, { vitorias: 0, derrotas: 0, empates: 0 });
      const stats = matchupPorPar.get(chavePar)!;
      if (chave1 < chave2) registrar(stats, resultado);
      else registrar(stats, inverter(resultado));
    }
  }

  const copiasPorChave = new Map<string, typeof copias>();
  for (const copia of copias) {
    const lista = copiasPorChave.get(copia.chave) ?? [];
    lista.push(copia);
    copiasPorChave.set(copia.chave, lista);
  }

  const totalDecks = copias.length;
  const colocacaoPorTorneio = new Map<string, Map<string, number>>();
  for (const t of torneios) {
    const jogadores = inscricoes.filter((i) => i.torneioId === t.id).map((i) => i.usuarioId);
    const partidasTorneio = input.partidas.filter((p) => p.torneioId === t.id);
    const stats = calcularEstatisticas(jogadores, partidasTorneio);
    const ordenados = ordenarPorDesempate([...stats.values()], stats);
    const mapa = new Map<string, number>();
    ordenados.forEach((s, idx) => mapa.set(s.usuarioId, idx + 1));
    colocacaoPorTorneio.set(t.id, mapa);
  }

  const recordPorCopia = (inscricao: Inscricao): StatsWL => {
    const rec: StatsWL = { vitorias: 0, derrotas: 0, empates: 0 };
    for (const partida of partidasValidas) {
      if (partida.torneioId !== inscricao.torneioId) continue;
      if (partida.jogador1Id === inscricao.usuarioId) {
        registrar(rec, resultadoPartida(partida.vitoriasJogador1, partida.vitoriasJogador2));
      } else if (partida.jogador2Id === inscricao.usuarioId) {
        registrar(rec, resultadoPartida(partida.vitoriasJogador2, partida.vitoriasJogador1));
      }
    }
    return rec;
  };

  const porSlug = new Map<string, ArquetipoDetalhe>();
  const arquetipos: ArquetipoResumo[] = [];

  for (const [chave, listaCopias] of copiasPorChave) {
    const nome = nomePorChave.get(chave)!;
    const slug = slugs.get(chave)!;
    const stats = statsPorChave.get(chave) ?? { vitorias: 0, derrotas: 0, empates: 0 };
    const decksUnicos = listaCopias.map((c) => c.deck);
    const primeiroDeck = listaCopias[0]?.deck;
    const tipicaMain = cartasDoCampo(primeiroDeck, "maindeck");
    const tipicaSide = cartasDoCampo(primeiroDeck, "sideboard");
    const tipicaCmd = cartasDoCampo(primeiroDeck, "commander");
    const ehCommander = formato === "commander" || formato === "commander500";
    const cartasCores = (ehCommander ? tipicaCmd : tipicaMain).map((c) => c.nome);
    const resumo: ArquetipoResumo = {
      nome,
      slug,
      copias: listaCopias.length,
      metaPct: totalDecks === 0 ? 0 : round1((listaCopias.length / totalDecks) * 100),
      vitorias: stats.vitorias,
      derrotas: stats.derrotas,
      empates: stats.empates,
      winrate: winrateDe(stats),
      cartaRepresentativa: cartaRepresentativa(
        decksUnicos,
        formato,
        input.overridesCartasRepresentativas?.[chaveCartaRepresentativaMetagame(formato, slug)]
      ),
      cartasChave: cartasChave(decksUnicos, formato),
      cartasCores,
      cores: coresDoArquetipo(decksUnicos, cartasCores),
    };
    arquetipos.push(resumo);

    const matchups: ArquetipoDetalhe["matchups"] = [];
    for (const [chavePar, wl] of matchupPorPar) {
      const [a, b] = chavePar.split("\0");
      const oponenteChave = a === chave ? b : b === chave ? a : null;
      if (!oponenteChave) continue;
      const doPontoDeVista: StatsWL =
        chave === a ? wl : { vitorias: wl.derrotas, derrotas: wl.vitorias, empates: wl.empates };
      const nomeOponente = nomePorChave.get(oponenteChave) ?? oponenteChave;
      matchups.push({
        nome: nomeOponente,
        slug: slugs.get(oponenteChave) ?? slugificarArquetipo(nomeOponente),
        vitorias: doPontoDeVista.vitorias,
        derrotas: doPontoDeVista.derrotas,
        empates: doPontoDeVista.empates,
        winrate: winrateDe(doPontoDeVista),
        partidas: doPontoDeVista.vitorias + doPontoDeVista.derrotas + doPontoDeVista.empates,
      });
    }
    matchups.sort((x, y) => y.partidas - x.partidas || x.nome.localeCompare(y.nome, "pt-BR"));

    const listas = listaCopias.map(({ inscricao, deck }) => ({
      deckId: deck.id,
      nome: deck.nome,
      nomeConsolidado: deck.nomeConsolidado ?? null,
      usuario: toUsuarioPublico(usuarioPorId.get(inscricao.usuarioId), inscricao.usuarioId),
      torneioId: inscricao.torneioId,
      torneioNome: torneioPorId.get(inscricao.torneioId)?.nome ?? inscricao.torneioId,
      maindeck: deck.maindeck.map((c) => ({ nome: c.nome, quantidade: c.quantidade })),
      sideboard: deck.sideboard.map((c) => ({ nome: c.nome, quantidade: c.quantidade })),
      commander: (deck.commander ?? []).map((c) => ({ nome: c.nome, quantidade: c.quantidade })),
    }));

    const resultados = listaCopias.map(({ inscricao, deck }) => {
      const rec = recordPorCopia(inscricao);
      const t = torneioPorId.get(inscricao.torneioId);
      return {
        torneioId: inscricao.torneioId,
        torneioNome: t?.nome ?? inscricao.torneioId,
        horario: (t?.horario ?? new Date(0)).toISOString(),
        usuario: toUsuarioPublico(usuarioPorId.get(inscricao.usuarioId), inscricao.usuarioId),
        colocacao: colocacaoPorTorneio.get(inscricao.torneioId)?.get(inscricao.usuarioId) ?? 0,
        vitorias: rec.vitorias,
        derrotas: rec.derrotas,
        empates: rec.empates,
        deckId: deck.id,
      };
    });
    resultados.sort((a, b) => b.horario.localeCompare(a.horario));

    porSlug.set(slug, {
      ...resumo,
      listaTipica: {
        maindeck: tipicaMain,
        sideboard: tipicaSide,
        commander: tipicaCmd,
      },
      listas,
      matchups,
      resultados,
    });
  }

  arquetipos.sort(
    (a, b) => b.copias - a.copias || b.winrate - a.winrate || a.nome.localeCompare(b.nome, "pt-BR")
  );

  const porTorneio = new Map<string, RecenteTorneio>();
  for (const detalhe of porSlug.values()) {
    for (const r of detalhe.resultados) {
      let grupo = porTorneio.get(r.torneioId);
      if (!grupo) {
        grupo = {
          torneioId: r.torneioId,
          torneioNome: r.torneioNome,
          horario: r.horario,
          decks: [],
        };
        porTorneio.set(r.torneioId, grupo);
      }
      grupo.decks.push({
        slug: detalhe.slug,
        nome: detalhe.nome,
        colocacao: r.colocacao,
        vitorias: r.vitorias,
        derrotas: r.derrotas,
        empates: r.empates,
        usuario: r.usuario,
      });
    }
  }
  const recentes = [...porTorneio.values()]
    .sort((a, b) => b.horario.localeCompare(a.horario))
    .slice(0, LIMITE_TORNEIOS_RECENTES)
    .map((grupo) => ({
      ...grupo,
      decks: [...grupo.decks]
        .sort((a, b) => a.colocacao - b.colocacao || b.vitorias - a.vitorias)
        .slice(0, LIMITE_DECKS_RECENTES),
    }));

  return {
    formato,
    dias: input.dias,
    totalDecks,
    totalTorneios: torneios.length,
    arquetipos,
    recentes,
    porSlug,
  };
}
