import { Partida } from "../entidade/partida";

export interface PartidaGateway {
  salvar(partida: Partida): Promise<void>;
  salvarVarias(partidas: Partida[]): Promise<void>;
  buscarPorId(id: string): Promise<Partida | null>;
  listarPorTorneio(torneioId: string): Promise<Partida[]>;
  /** Batch: busca todas as partidas de múltiplos torneios (evita N+1). */
  listarPorTorneios(torneioIds: string[]): Promise<Partida[]>;
  listarPorTorneioERodada(torneioId: string, rodada: number): Promise<Partida[]>;
  listarPorJogadorETorneio(torneioId: string, usuarioId: string): Promise<Partida[]>;
  atualizar(partida: Partida): Promise<void>;
  /** Finaliza a partida atomicamente — retorna null se já estava finalizada (race condition). */
  finalizarAtomicamente(id: string, v1: number, v2: number): Promise<Partida | null>;
  /** Reabre a partida para contestação — retorna null se não estava finalizada. */
  contestarPartida(id: string): Promise<Partida | null>;
  /** Verifica se já foi criada alguma rodada posterior (impede contestação tardia). */
  existePartidaRodadaPosterior(torneioId: string, rodada: number): Promise<boolean>;
}
