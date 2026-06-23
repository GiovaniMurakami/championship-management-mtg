export type RankTier = "bronze" | "prata" | "ouro" | "foguete";

export const PONTOS_RANK_INICIAL = 500;

const LIMIAR_PRATA = 500;
const LIMIAR_OURO = 1000;
const LIMIAR_FOGUETE = 1500;

const ORDEM_TIER: Record<RankTier, number> = {
  bronze: 0,
  prata: 1,
  ouro: 2,
  foguete: 3,
};

export function obterRankPorPontos(pontos: number): RankTier {
  if (pontos >= LIMIAR_FOGUETE) return "foguete";
  if (pontos >= LIMIAR_OURO) return "ouro";
  if (pontos >= LIMIAR_PRATA) return "prata";
  return "bronze";
}

export function obterProximoRank(rank: RankTier): RankTier | null {
  if (rank === "bronze") return "prata";
  if (rank === "prata") return "ouro";
  if (rank === "ouro") return "foguete";
  return null;
}

export function obterPontosParaProximoRank(pontos: number): number | null {
  const rank = obterRankPorPontos(pontos);
  if (rank === "bronze") return LIMIAR_PRATA - pontos;
  if (rank === "prata") return LIMIAR_OURO - pontos;
  if (rank === "ouro") return LIMIAR_FOGUETE - pontos;
  return null;
}

export type VariacaoRank = {
  ganhoVencedor: number;
  perdaPerdedor: number;
};

/**
 * Calcula ganho/perda de pontos com base no rank (tier) de cada jogador.
 * Upsets (tier baixo vence tier alto) geram perdas grandes para o favorito.
 * Partidas entre o mesmo tier trocam poucos pontos.
 */
export function calcularVariacaoRank(
  pontosVencedor: number,
  pontosPerdedor: number
): VariacaoRank {
  const tierVencedor = obterRankPorPontos(pontosVencedor);
  const tierPerdedor = obterRankPorPontos(pontosPerdedor);
  const diff = ORDEM_TIER[tierPerdedor] - ORDEM_TIER[tierVencedor];

  if (diff === 0) {
    return { ganhoVencedor: 12, perdaPerdedor: 12 };
  }

  if (diff > 0) {
    return {
      ganhoVencedor: 10 + diff * 6,
      perdaPerdedor: 12 + diff * 14,
    };
  }

  const diffInv = Math.abs(diff);
  return {
    ganhoVencedor: Math.max(6, 12 - diffInv * 3),
    perdaPerdedor: Math.max(6, 12 - diffInv * 3),
  };
}

export function aplicarDeltaPontos(pontosAtuais: number, delta: number): number {
  return Math.max(0, pontosAtuais + delta);
}

export type ResultadoRankPartida = {
  vencedorId: string;
  perdedorId: string;
  deltaVencedor: number;
  deltaPerdedor: number;
  rankVencedorAntes: RankTier;
  rankPerdedorAntes: RankTier;
  rankVencedorDepois: RankTier;
  rankPerdedorDepois: RankTier;
  pontosVencedorDepois: number;
  pontosPerdedorDepois: number;
};

export function calcularResultadoRankPartida(params: {
  jogador1Id: string;
  jogador2Id: string;
  vitoriasJogador1: number;
  vitoriasJogador2: number;
  pontosJogador1: number;
  pontosJogador2: number;
}): ResultadoRankPartida | null {
  const { jogador1Id, jogador2Id, vitoriasJogador1, vitoriasJogador2, pontosJogador1, pontosJogador2 } = params;

  if (vitoriasJogador1 === vitoriasJogador2) return null;

  const jogador1Venceu = vitoriasJogador1 > vitoriasJogador2;
  const vencedorId = jogador1Venceu ? jogador1Id : jogador2Id;
  const perdedorId = jogador1Venceu ? jogador2Id : jogador1Id;
  const pontosVencedor = jogador1Venceu ? pontosJogador1 : pontosJogador2;
  const pontosPerdedor = jogador1Venceu ? pontosJogador2 : pontosJogador1;

  const { ganhoVencedor, perdaPerdedor } = calcularVariacaoRank(pontosVencedor, pontosPerdedor);
  const pontosVencedorDepois = aplicarDeltaPontos(pontosVencedor, ganhoVencedor);
  const pontosPerdedorDepois = aplicarDeltaPontos(pontosPerdedor, -perdaPerdedor);

  return {
    vencedorId,
    perdedorId,
    deltaVencedor: ganhoVencedor,
    deltaPerdedor: -perdaPerdedor,
    rankVencedorAntes: obterRankPorPontos(pontosVencedor),
    rankPerdedorAntes: obterRankPorPontos(pontosPerdedor),
    rankVencedorDepois: obterRankPorPontos(pontosVencedorDepois),
    rankPerdedorDepois: obterRankPorPontos(pontosPerdedorDepois),
    pontosVencedorDepois,
    pontosPerdedorDepois,
  };
}

export function deltasParaJogadores(
  jogador1Id: string,
  jogador2Id: string,
  resultado: ResultadoRankPartida
): { deltaJogador1: number; deltaJogador2: number } {
  const deltaJogador1 = resultado.vencedorId === jogador1Id
    ? resultado.deltaVencedor
    : resultado.deltaPerdedor;
  const deltaJogador2 = resultado.vencedorId === jogador2Id
    ? resultado.deltaVencedor
    : resultado.deltaPerdedor;
  return { deltaJogador1, deltaJogador2 };
}

export function montarResumoRank(pontosRank: number) {
  const rank = obterRankPorPontos(pontosRank);
  return {
    pontosRank,
    rank,
    proximoRank: obterProximoRank(rank),
    pontosParaProximoRank: obterPontosParaProximoRank(pontosRank),
  };
}
