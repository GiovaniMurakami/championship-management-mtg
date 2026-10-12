import { Partida } from "../entidade/partida";

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
  /**
   * Análogo ao Team Id do Melee (último desempate, Asc — menor fica à frente).
   * Nos torneios Fuguete: timestamp de inscrição (`criadoEm`).
   */
  desempateFinal?: number;
  /**
   * Melee: com mesmos pontos, quem avançou ao Day 2 fica à frente de quem foi
   * cortado no Day 1 — mesmo com OMW/GW/OGW piores.
   */
  avancouDay2?: boolean;
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
        // Bye de penalidade/forfeit: conta como partida, mas não entra no GWP
        // (alinha com Melee/WotC: forfeit sem game wins/byes).
        if (partida.tipoBye !== "penalidade") {
          s.vitoriasJogo += v1;
          s.totalJogosJogados += v1 + v2;
        }
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

/**
 * Piso WotC/Melee para MWP/GWP/OMW/OGW.
 * Melee (torneio 447619) expõe TiebreakerFallbackPercentage = "1/3".
 * Usar 0.33 reordena standings (Δ OMW ≈ 0.00111 por oponente no piso).
 */
export const MIN_PERCENTUAL = 1 / 3;

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

export type PercentuaisDesempate = {
  mwp: number;
  omwp: number;
  gwp: number;
  ogwp: number;
};

/**
 * Melee (Day 1 → corte → Day 2): OMW/OGW de quem dropou congela na rodada do drop.
 * Oponentes que seguem no Day 2 não “puxam” o OMW de quem ficou no Day 1.
 */
export function calcularPercentuaisComCongelamentoDrop(
  statsMap: Map<string, EstatisticasJogador>,
  jogadoresIds: string[],
  partidas: Partida[],
  droppedRodadaPorUsuario: Map<string, number | null | undefined>
): Map<string, PercentuaisDesempate> {
  const cacheAte = new Map<number, Map<string, EstatisticasJogador>>();
  const statsAte = (maxRodada: number) => {
    let cached = cacheAte.get(maxRodada);
    if (!cached) {
      cached = calcularEstatisticas(
        jogadoresIds,
        partidas.filter((p) => p.rodada <= maxRodada)
      );
      cacheAte.set(maxRodada, cached);
    }
    return cached;
  };

  const saida = new Map<string, PercentuaisDesempate>();
  for (const [id, s] of statsMap) {
    const drop = droppedRodadaPorUsuario.get(id);
    const oppMap =
      drop != null && drop > 0 ? statsAte(drop) : statsMap;
    saida.set(id, {
      mwp: mwp(s),
      gwp: gwp(s),
      omwp: omwp(s, oppMap),
      ogwp: ogwp(s, oppMap),
    });
  }
  return saida;
}

/**
 * Preenche o último desempate Melee (Team Id Asc) com o instante de inscrição.
 */
export function aplicarDesempateFinalPorInscricao(
  statsMap: Map<string, EstatisticasJogador>,
  inscricoes: Array<{ usuarioId: string; criadoEm: Date }>
): void {
  for (const i of inscricoes) {
    const s = statsMap.get(i.usuarioId);
    if (s) s.desempateFinal = i.criadoEm.getTime();
  }
}

/**
 * Marca quem avançou ao Day 2. Drop no fim do Day 1 (corte) → não avançou.
 */
export function aplicarAvancoDay2(
  statsMap: Map<string, EstatisticasJogador>,
  inscricoes: Array<{ usuarioId: string; dropped?: boolean; droppedRodada?: number | null }>,
  rodadasDay1?: number | null
): void {
  if (!rodadasDay1 || rodadasDay1 <= 0) return;
  for (const i of inscricoes) {
    const s = statsMap.get(i.usuarioId);
    if (!s) continue;
    const dropouNoDay1 =
      Boolean(i.dropped) &&
      i.droppedRodada != null &&
      i.droppedRodada <= rodadasDay1;
    s.avancouDay2 = !dropouNoDay1;
  }
}

export function ordenarPorDesempate(
  jogadores: EstatisticasJogador[],
  statsMap: Map<string, EstatisticasJogador>,
  percentuais?: Map<string, PercentuaisDesempate>
): EstatisticasJogador[] {
  const omwpDe = (s: EstatisticasJogador) =>
    percentuais?.get(s.usuarioId)?.omwp ?? omwp(s, statsMap);
  const gwpDe = (s: EstatisticasJogador) =>
    percentuais?.get(s.usuarioId)?.gwp ?? gwp(s);
  const ogwpDe = (s: EstatisticasJogador) =>
    percentuais?.get(s.usuarioId)?.ogwp ?? ogwp(s, statsMap);

  return [...jogadores].sort((a, b) => {
    if (b.pontosMesa !== a.pontosMesa) return b.pontosMesa - a.pontosMesa;
    // Melee: Day 2 > Cut (Day 1), antes de OMW/GW/OGW
    const day2A = Boolean(a.avancouDay2);
    const day2B = Boolean(b.avancouDay2);
    if (day2A !== day2B) return day2A ? -1 : 1;
    const omwpDiff = omwpDe(b) - omwpDe(a);
    if (Math.abs(omwpDiff) > 1e-9) return omwpDiff;
    const gwpDiff = gwpDe(b) - gwpDe(a);
    if (Math.abs(gwpDiff) > 1e-9) return gwpDiff;
    const ogwpDiff = ogwpDe(b) - ogwpDe(a);
    if (Math.abs(ogwpDiff) > 1e-9) return ogwpDiff;
    // Melee: Team Id Asc
    const da = a.desempateFinal;
    const db = b.desempateFinal;
    if (da != null && db != null && da !== db) return da - db;
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
