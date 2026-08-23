import { v4 as uuidv4 } from "uuid";
import { Carta } from "./deck";

export type StatusPartidaRanqueada = "pendente" | "aguardando_confirmacao" | "contestada" | "finalizada";

export interface RankingRanqueado {
  jogadorId: string;
  jogadorNome: string;
  formato: string;
  rating: number;
  vitorias: number;
  derrotas: number;
  empates: number;
  atualizadoEm: string;
}

export interface EntradaFilaRanqueada {
  jogadorId: string;
  jogadorNome: string;
  deckId: string;
  deckNome: string;
  deckSnapshot: DeckRanqueadoSnapshot;
  formato: string;
  vitoriasCampanha: number;
  derrotasCampanha: number;
  partidasCampanha: number;
  ultimoOponenteId?: string | null;
  rating: number;
  divisao: string;
  entrouEm: string;
}

export interface DeckRanqueadoSnapshot {
  id: string;
  nome: string;
  formato: string;
  maindeck: Carta[];
  sideboard: Carta[];
  commander: Carta[];
}

export interface PunicaoRanqueada {
  jogadorId: string;
  warnings: number;
  bloqueadoAte: string | null;
  atualizadoEm: string;
}

export interface PartidaRanqueada {
  id: string;
  formato: string;
  jogador1Id: string;
  jogador1Nome: string;
  jogador1Divisao: string;
  jogador2Id: string;
  jogador2Nome: string;
  jogador2Divisao: string;
  deckJogador1Id: string;
  deckJogador2Id: string;
  deckJogador1: DeckRanqueadoSnapshot;
  deckJogador2: DeckRanqueadoSnapshot;
  status: StatusPartidaRanqueada;
  vencedorId?: string | null;
  resultadoReportadoPor?: string;
  confirmarAte?: string;
  observacaoContestacao?: string | null;
  evidenciaUrl?: string | null;
  tipoContestacao?: "resultado" | "deck";
  acusadoId?: string;
  contestadoPor?: string;
  deltaJogador1?: number;
  deltaJogador2?: number;
  criadoEm: string;
  finalizadoEm?: string;
  atualizadoEm?: string;
}

export interface EstadoRanqueado {
  jogadorId: string;
  formato: string;
  vitoriasCampanha: number;
  derrotasCampanha: number;
  partidasCampanha: number;
  deckCampanhaId?: string | null;
  deckCampanhaNome?: string | null;
  deckCampanha?: DeckRanqueadoSnapshot | null;
  ultimoOponenteId?: string | null;
  partidaId?: string | null;
}

export function criarPartidaRanqueada(a: EntradaFilaRanqueada, b: EntradaFilaRanqueada): PartidaRanqueada {
  return {
    id: uuidv4(), formato: a.formato,
    jogador1Id: a.jogadorId, jogador1Nome: a.jogadorNome, jogador1Divisao: a.divisao,
    jogador2Id: b.jogadorId, jogador2Nome: b.jogadorNome, jogador2Divisao: b.divisao,
    deckJogador1Id: a.deckId, deckJogador2Id: b.deckId,
    deckJogador1: a.deckSnapshot, deckJogador2: b.deckSnapshot,
    status: "pendente", criadoEm: new Date().toISOString(),
  };
}

export function divisaoRanqueada(rating: number): string {
  if (rating >= 1600) return "Diamante";
  if (rating >= 1400) return "Platina";
  if (rating >= 1200) return "Ouro";
  if (rating >= 1000) return "Prata";
  return "Bronze";
}

export function classificarRankingRanqueado(rankings: RankingRanqueado[]) {
  const ordenados = [...rankings].sort((a, b) => b.rating - a.rating || b.vitorias - a.vitorias || a.jogadorId.localeCompare(b.jogadorId));
  const fuguetes = new Set(ordenados.filter((item) => item.rating >= 1800).slice(0, 25).map((item) => item.jogadorId));
  return ordenados.map((item) => ({ ...item, divisao: fuguetes.has(item.jogadorId) ? "Fuguete" : divisaoRanqueada(item.rating) }));
}

export function calcularDeltaElo(ratingA: number, ratingB: number, resultadoA: 0 | 0.5 | 1, k = 32): number {
  const esperado = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  return Math.round(k * (resultadoA - esperado));
}
