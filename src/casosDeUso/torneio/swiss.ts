import { Partida } from "../../dominio/entidade/partida";

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
        const v1 = partida.vitoriasJogador1;
        const v2 = partida.vitoriasJogador2;
        const ehVitoria = v1 > v2;
        const ehEmpate = v1 === v2 && v1 > 0;
        s.pontosMesa += ehVitoria ? 3 : ehEmpate ? 1 : 0;
        s.vitoriasPartida += ehVitoria ? 1 : 0;
        s.empatesPartida += ehEmpate ? 1 : 0;
        s.derrotasPartida += (!ehVitoria && !ehEmpate) ? 1 : 0;
        s.totalPartidasJogadas += 1;
        s.vitoriasJogo += v1;
        s.totalJogosJogados += v1 + v2;
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

export const MIN_PERCENTUAL = 0.33;

export function mwp(s: EstatisticasJogador): number {
  if (s.totalPartidasJogadas === 0) return MIN_PERCENTUAL;
  return Math.max(MIN_PERCENTUAL, s.pontosMesa / (3 * s.totalPartidasJogadas));
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
    const ogwpDiff = ogwp(b, statsMap) - ogwp(a, statsMap);
    if (Math.abs(ogwpDiff) > 1e-9) return ogwpDiff;
    // Critério final determinístico: ordem lexicográfica do ID
    return a.usuarioId.localeCompare(b.usuarioId);
  });
}

export function parKey(id1: string, id2: string): string {
  return [id1, id2].sort().join("|");
}

type ParSwiss = { jogador1Id: string; jogador2Id: string | null };

export function gerarPareamentos(
  ordenados: EstatisticasJogador[],
  historico: Set<string>,
  jaRecebeuBye: Set<string> = new Set()
): ParSwiss[] {
  const ids = ordenados.map((j) => j.usuarioId);
  const semRematch = parearComBacktrack(ids, historico, true);
  const pares = semRematch ?? parearComBacktrack(ids, historico, false) ?? [];
  aplicarTrocaBye(pares, historico, jaRecebeuBye);
  return pares;
}

function parearComBacktrack(
  remaining: string[],
  historico: Set<string>,
  proibirRematch: boolean
): ParSwiss[] | null {
  if (remaining.length === 0) return [];
  if (remaining.length === 1) {
    return [{ jogador1Id: remaining[0], jogador2Id: null }];
  }

  const atual = remaining[0];
  const others = remaining.slice(1);
  const legais: number[] = [];
  const rematches: number[] = [];

  for (let i = 0; i < others.length; i++) {
    if (historico.has(parKey(atual, others[i]))) rematches.push(i);
    else legais.push(i);
  }

  const ordem = proibirRematch ? legais : [...legais, ...rematches];
  for (const i of ordem) {
    const oponente = others[i];
    const rest = others.filter((_, j) => j !== i);
    const sub = parearComBacktrack(rest, historico, proibirRematch);
    if (sub) {
      return [{ jogador1Id: atual, jogador2Id: oponente }, ...sub];
    }
  }

  // Campo ímpar: se parear este jogador trava o restante, tenta BYE nele.
  if (proibirRematch && remaining.length % 2 === 1) {
    const sub = parearComBacktrack(others, historico, true);
    if (sub) {
      return [...sub, { jogador1Id: atual, jogador2Id: null }];
    }
  }

  return null;
}

function aplicarTrocaBye(
  pares: ParSwiss[],
  historico: Set<string>,
  jaRecebeuBye: Set<string>
): void {
  if (pares.length < 2) return;
  const ultimo = pares[pares.length - 1];
  if (ultimo.jogador2Id !== null || !jaRecebeuBye.has(ultimo.jogador1Id)) return;

  const quemTemBye = ultimo.jogador1Id;

  for (let i = pares.length - 2; i >= 0; i--) {
    const par = pares[i];
    const candidatos = [par.jogador2Id, par.jogador1Id].filter(
      (id): id is string => id !== null && !jaRecebeuBye.has(id)
    );

    for (const substituto of candidatos) {
      const outro = par.jogador1Id === substituto ? par.jogador2Id! : par.jogador1Id;
      if (historico.has(parKey(outro, quemTemBye))) continue;

      pares[i] = { jogador1Id: outro, jogador2Id: quemTemBye };
      pares[pares.length - 1] = { jogador1Id: substituto, jogador2Id: null };
      return;
    }
  }
}
