import { Partida } from "../../dominio/entidade/partida";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface EstatisticasJogador {
  usuarioId: string;
  pontosMesa: number;
  vitoriasPartida: number;
  empatesPartida: number;
  derrotasPartida: number;
  totalPartidasJogadas: number;
  vitoriasJogo: number;
  totalJogosJogados: number;
  oponentesIds: string[];
}

// ---------------------------------------------------------------------------
// Cálculo de estatísticas
// ---------------------------------------------------------------------------

export function calcularEstatisticas(
  jogadoresIds: string[],
  todasPartidas: Partida[]
): Map<string, EstatisticasJogador> {
  const statsMap = new Map<string, EstatisticasJogador>();

  for (const id of jogadoresIds) {
    statsMap.set(id, {
      usuarioId: id,
      pontosMesa: 0,
      vitoriasPartida: 0,
      empatesPartida: 0,
      derrotasPartida: 0,
      totalPartidasJogadas: 0,
      vitoriasJogo: 0,
      totalJogosJogados: 0,
      oponentesIds: [],
    });
  }

  const finalizadas = todasPartidas.filter((p) => p.status === "finalizada");

  for (const partida of finalizadas) {
    if (partida.jogador2Id === null) {
      const s = statsMap.get(partida.jogador1Id);
      if (s) {
        s.pontosMesa += 3;
        s.vitoriasPartida += 1;
        s.totalPartidasJogadas += 1;
        s.vitoriasJogo += 2;
        s.totalJogosJogados += 2;
      }
      continue;
    }

    const v1 = partida.vitoriasJogador1;
    const v2 = partida.vitoriasJogador2;
    const s1 = statsMap.get(partida.jogador1Id);
    const s2 = statsMap.get(partida.jogador2Id);

    if (s1) {
      s1.vitoriasJogo += v1;
      s1.totalJogosJogados += v1 + v2;
      s1.totalPartidasJogadas += 1;
      s1.oponentesIds.push(partida.jogador2Id);
      if (v1 > v2) { s1.pontosMesa += 3; s1.vitoriasPartida += 1; }
      else if (v1 === v2) { s1.pontosMesa += 1; s1.empatesPartida += 1; }
      else { s1.derrotasPartida += 1; }
    }

    if (s2) {
      s2.vitoriasJogo += v2;
      s2.totalJogosJogados += v1 + v2;
      s2.totalPartidasJogadas += 1;
      s2.oponentesIds.push(partida.jogador1Id);
      if (v2 > v1) { s2.pontosMesa += 3; s2.vitoriasPartida += 1; }
      else if (v2 === v1) { s2.pontosMesa += 1; s2.empatesPartida += 1; }
      else { s2.derrotasPartida += 1; }
    }
  }

  return statsMap;
}

// ---------------------------------------------------------------------------
// Critérios de desempate MTG
// ---------------------------------------------------------------------------

export const MIN_PERCENTUAL = 0.33;

export function mwp(s: EstatisticasJogador): number {
  if (s.totalPartidasJogadas === 0) return MIN_PERCENTUAL;
  return Math.max(MIN_PERCENTUAL, s.vitoriasPartida / s.totalPartidasJogadas);
}

export function gwp(s: EstatisticasJogador): number {
  if (s.totalJogosJogados === 0) return MIN_PERCENTUAL;
  return Math.max(MIN_PERCENTUAL, s.vitoriasJogo / s.totalJogosJogados);
}

export function omwp(
  s: EstatisticasJogador,
  statsMap: Map<string, EstatisticasJogador>
): number {
  if (s.oponentesIds.length === 0) return MIN_PERCENTUAL;
  const soma = s.oponentesIds.reduce((acc, oppId) => {
    const opp = statsMap.get(oppId);
    return acc + (opp ? mwp(opp) : MIN_PERCENTUAL);
  }, 0);
  return soma / s.oponentesIds.length;
}

export function ogwp(
  s: EstatisticasJogador,
  statsMap: Map<string, EstatisticasJogador>
): number {
  if (s.oponentesIds.length === 0) return MIN_PERCENTUAL;
  const soma = s.oponentesIds.reduce((acc, oppId) => {
    const opp = statsMap.get(oppId);
    return acc + (opp ? gwp(opp) : MIN_PERCENTUAL);
  }, 0);
  return soma / s.oponentesIds.length;
}

export function ordenarPorDesempate(
  jogadores: EstatisticasJogador[],
  statsMap: Map<string, EstatisticasJogador>
): EstatisticasJogador[] {
  return [...jogadores].sort((a, b) => {
    if (b.pontosMesa !== a.pontosMesa) return b.pontosMesa - a.pontosMesa;
    const omwpDiff = omwp(b, statsMap) - omwp(a, statsMap);
    if (Math.abs(omwpDiff) > 1e-9) return omwpDiff;
    const gwpDiff = gwp(b) - gwp(a);
    if (Math.abs(gwpDiff) > 1e-9) return gwpDiff;
    return ogwp(b, statsMap) - ogwp(a, statsMap);
  });
}

// ---------------------------------------------------------------------------
// Pareamento Swiss (greedy, evita rematches)
// ---------------------------------------------------------------------------

export function parKey(id1: string, id2: string): string {
  return [id1, id2].sort().join("|");
}

export function gerarPareamentos(
  ordenados: EstatisticasJogador[],
  historico: Set<string>
): Array<{ jogador1Id: string; jogador2Id: string | null }> {
  const fila = [...ordenados];
  const pares: Array<{ jogador1Id: string; jogador2Id: string | null }> = [];

  while (fila.length > 0) {
    const atual = fila.shift()!;

    if (fila.length === 0) {
      pares.push({ jogador1Id: atual.usuarioId, jogador2Id: null });
      break;
    }

    let idxOponente = fila.findIndex(
      (j) => !historico.has(parKey(atual.usuarioId, j.usuarioId))
    );
    if (idxOponente === -1) idxOponente = 0;

    const oponente = fila.splice(idxOponente, 1)[0];
    pares.push({ jogador1Id: atual.usuarioId, jogador2Id: oponente.usuarioId });
  }

  return pares;
}
