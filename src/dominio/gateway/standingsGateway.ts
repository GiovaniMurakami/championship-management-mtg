import { Standings } from "../entidade/standings";

export interface StandingsGateway {
  /** Upsert por (torneioId, rodada). Idempotente sob índice único. */
  salvarSnapshot(standings: Standings): Promise<Standings>;
  buscarPorTorneioERodada(torneioId: string, rodada: number): Promise<Standings | null>;
  /** Snapshot com maior rodada materializada. */
  buscarAtual(torneioId: string): Promise<Standings | null>;
  excluirPorTorneioERodada(torneioId: string, rodada: number): Promise<number>;
  excluirPorTorneio(torneioId: string): Promise<number>;
}
