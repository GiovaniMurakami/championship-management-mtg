import { Deck } from "../../dominio/entidade/deck";
import { Inscricao } from "../../dominio/entidade/inscricao";
import { Partida } from "../../dominio/entidade/partida";
import { Usuario } from "../../dominio/entidade/usuario";
import { NOME_OUTROS } from "./agregarMetagame";

export type DestaqueMetaDay2 = {
  nome: string;
  slug: string;
  copias: number;
  metaPct: number;
};

export type DestaqueDesempenhoDay2 = {
  usuarioId: string;
  nome: string;
  deckNome: string;
  slug: string;
  vitorias: number;
  derrotas: number;
  empates: number;
};

export type DestaquePartidaCorte = {
  rodada: number;
  mesa: number | null;
  jogador1: string;
  jogador2: string | null;
  placar: string;
  vencedor: string | null;
  upset: boolean;
};

export type DestaquesDay2 = {
  jogadores: number;
  arquetipos: number;
  meta: DestaqueMetaDay2[];
  melhorDesempenho: DestaqueDesempenhoDay2[];
  corte: DestaquePartidaCorte[];
  resumo: {
    partidas: number;
    varreduras2a0: number;
    pctVarreduras: number;
    mediaGames: number;
  };
};

function slugify(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "outros";
}

function nomeArquetipo(deck: Deck | undefined): string {
  const consolidado = deck?.nomeConsolidado?.trim();
  if (consolidado) return consolidado;
  const nome = deck?.nome?.trim();
  return nome || NOME_OUTROS;
}

export function obterPrimeiraRodadaCorte(corteTop?: number, totalRodadas?: number): number | null {
  const corte = Number(corteTop || 0);
  const total = Number(totalRodadas || 0);
  if (corte < 2 || total < 2) return null;
  const rodadasCorte = Math.log2(corte);
  if (!Number.isInteger(rodadasCorte) || rodadasCorte < 1) return null;
  return total - rodadasCorte + 1;
}

function passouParaDay2(inscricao: Inscricao, rodadasDay1: number): boolean {
  if (!inscricao.dropped) return true;
  return inscricao.droppedRodada != null && inscricao.droppedRodada > rodadasDay1;
}

function resultadoPartida(
  partida: Partida,
  usuarioId: string,
): "W" | "L" | "D" | null {
  if (partida.status !== "finalizada") return null;
  const j1 = partida.jogador1Id;
  const j2 = partida.jogador2Id;
  if (usuarioId !== j1 && usuarioId !== j2) return null;
  if (!j2) return usuarioId === j1 ? "W" : null;
  const v1 = Number(partida.vitoriasJogador1 || 0);
  const v2 = Number(partida.vitoriasJogador2 || 0);
  if (v1 === v2) return "D";
  const ganhou = (usuarioId === j1 && v1 > v2) || (usuarioId === j2 && v2 > v1);
  return ganhou ? "W" : "L";
}

export function calcularDestaquesDay2(input: {
  rodadasDay1: number;
  corteTop?: number;
  totalRodadas?: number;
  inscricoes: Inscricao[];
  partidas: Partida[];
  decksPorId: Map<string, Deck>;
  usuariosPorId: Map<string, Usuario>;
  slugPorDeckId?: Map<string, string>;
  limiteMeta?: number;
  limiteDesempenho?: number;
}): DestaquesDay2 | undefined {
  const rodadasDay1 = Number(input.rodadasDay1 || 0);
  if (rodadasDay1 < 1) return undefined;

  const day2Inscricoes = input.inscricoes.filter(
    (i) => i.deckId && input.decksPorId.has(i.deckId) && passouParaDay2(i, rodadasDay1),
  );
  if (day2Inscricoes.length === 0) return undefined;

  const day2Ids = new Set(day2Inscricoes.map((i) => i.usuarioId));
  const primeiraCorte = obterPrimeiraRodadaCorte(input.corteTop, input.totalRodadas);
  const ultimaSwissDay2 = primeiraCorte != null ? primeiraCorte - 1 : Number.POSITIVE_INFINITY;

  const metaCount = new Map<string, { nome: string; slug: string; copias: number }>();
  for (const inscricao of day2Inscricoes) {
    const deck = input.decksPorId.get(inscricao.deckId!);
    const nome = nomeArquetipo(deck);
    const slug = input.slugPorDeckId?.get(inscricao.deckId!) || slugify(nome);
    const atual = metaCount.get(slug) || { nome, slug, copias: 0 };
    atual.copias += 1;
    metaCount.set(slug, atual);
  }
  const totalDay2 = day2Inscricoes.length;
  const limiteMeta = input.limiteMeta ?? 8;
  const meta = [...metaCount.values()]
    .sort((a, b) => b.copias - a.copias || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, limiteMeta)
    .map((m) => ({
      nome: m.nome,
      slug: m.slug,
      copias: m.copias,
      metaPct: Math.round((m.copias / totalDay2) * 1000) / 10,
    }));

  const stats = new Map<string, { w: number; l: number; d: number }>();
  for (const uid of day2Ids) stats.set(uid, { w: 0, l: 0, d: 0 });

  let partidasContadas = 0;
  let varreduras2a0 = 0;
  let somaGames = 0;

  for (const partida of input.partidas) {
    const rodada = Number(partida.rodada || 0);
    if (rodada <= rodadasDay1) continue;
    if (partida.status !== "finalizada") continue;

    const noDay2 =
      day2Ids.has(partida.jogador1Id) ||
      (partida.jogador2Id != null && day2Ids.has(partida.jogador2Id));
    if (!noDay2) continue;

    const v1 = Number(partida.vitoriasJogador1 || 0);
    const v2 = Number(partida.vitoriasJogador2 || 0);
    if (partida.jogador2Id) {
      partidasContadas += 1;
      somaGames += v1 + v2;
      const [hi, lo] = v1 >= v2 ? [v1, v2] : [v2, v1];
      if (hi === 2 && lo === 0) varreduras2a0 += 1;
    }

    if (rodada > ultimaSwissDay2) continue;
    for (const uid of [partida.jogador1Id, partida.jogador2Id].filter(Boolean) as string[]) {
      if (!day2Ids.has(uid)) continue;
      const r = resultadoPartida(partida, uid);
      const s = stats.get(uid);
      if (!s || !r) continue;
      if (r === "W") s.w += 1;
      else if (r === "L") s.l += 1;
      else s.d += 1;
    }
  }

  const deckPorUsuario = new Map(
    day2Inscricoes.map((i) => [i.usuarioId, i.deckId!] as const),
  );
  const limiteDesempenho = input.limiteDesempenho ?? 5;
  const melhorDesempenho = [...stats.entries()]
    .map(([usuarioId, s]) => {
      const deckId = deckPorUsuario.get(usuarioId);
      const deck = deckId ? input.decksPorId.get(deckId) : undefined;
      const nomeDeck = nomeArquetipo(deck);
      return {
        usuarioId,
        nome: input.usuariosPorId.get(usuarioId)?.nome || usuarioId,
        deckNome: nomeDeck,
        slug: (deckId && input.slugPorDeckId?.get(deckId)) || slugify(nomeDeck),
        vitorias: s.w,
        derrotas: s.l,
        empates: s.d,
      };
    })
    .sort(
      (a, b) =>
        b.vitorias - a.vitorias ||
        a.derrotas - b.derrotas ||
        b.empates - a.empates ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    )
    .slice(0, limiteDesempenho);

  const corte: DestaquePartidaCorte[] = [];
  if (primeiraCorte != null) {
    const swissWins = new Map(
      [...stats.entries()].map(([uid, s]) => [uid, s.w] as const),
    );
    const partidasCorte = input.partidas
      .filter((p) => Number(p.rodada) >= primeiraCorte && p.status === "finalizada")
      .sort(
        (a, b) =>
          Number(a.rodada) - Number(b.rodada) || Number(a.mesa ?? 0) - Number(b.mesa ?? 0),
      );

    for (const partida of partidasCorte) {
      const n1 = input.usuariosPorId.get(partida.jogador1Id)?.nome || partida.jogador1Id;
      const n2 = partida.jogador2Id
        ? input.usuariosPorId.get(partida.jogador2Id)?.nome || partida.jogador2Id
        : null;
      const v1 = Number(partida.vitoriasJogador1 || 0);
      const v2 = Number(partida.vitoriasJogador2 || 0);
      let vencedorId: string | null = null;
      if (!partida.jogador2Id) vencedorId = partida.jogador1Id;
      else if (v1 > v2) vencedorId = partida.jogador1Id;
      else if (v2 > v1) vencedorId = partida.jogador2Id;

      const perdedorId =
        vencedorId && partida.jogador2Id
          ? vencedorId === partida.jogador1Id
            ? partida.jogador2Id
            : partida.jogador1Id
          : null;
      const winsV = vencedorId != null ? swissWins.get(vencedorId) ?? 0 : 0;
      const winsP = perdedorId != null ? swissWins.get(perdedorId) ?? 0 : 0;
      // Upset simples: vencedor tinha menos vitórias no Swiss Day 2 que o perdedor
      const upset = Boolean(vencedorId && perdedorId && winsV < winsP);

      corte.push({
        rodada: Number(partida.rodada),
        mesa: partida.mesa ?? null,
        jogador1: n1,
        jogador2: n2,
        placar: partida.jogador2Id ? `${v1}-${v2}` : "BYE",
        vencedor: vencedorId
          ? input.usuariosPorId.get(vencedorId)?.nome || vencedorId
          : null,
        upset,
      });
    }
  }

  return {
    jogadores: totalDay2,
    arquetipos: metaCount.size,
    meta,
    melhorDesempenho,
    corte,
    resumo: {
      partidas: partidasContadas,
      varreduras2a0,
      pctVarreduras: partidasContadas > 0 ? varreduras2a0 / partidasContadas : 0,
      mediaGames: partidasContadas > 0 ? Math.round((somaGames / partidasContadas) * 100) / 100 : 0,
    },
  };
}
