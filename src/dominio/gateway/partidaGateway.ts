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
  /** Marca a partida como contestada (tag) — mantém o resultado; retorna null se não estava finalizada. */
  contestarPartida(id: string): Promise<Partida | null>;
  /** Admin ajusta resultado de partida contestada — pode sobrescrever resultado finalizado. */
  ajustarResultadoContestado(id: string, v1: number, v2: number): Promise<Partida | null>;
  /** Atualiza o jogador2 de uma partida BYE (jogador2Id estava null). */
  atualizarJogador2Partida(id: string, jogador2Id: string): Promise<Partida | null>;
  /** Verifica se já foi criada alguma rodada posterior (impede contestação tardia). */
  existePartidaRodadaPosterior(torneioId: string, rodada: number): Promise<boolean>;
  /** Busca a partida BYE (jogador2Id=null) de uma rodada específica de um torneio, se existir. */
  buscarByePartidaRodada(torneioId: string, rodada: number): Promise<Partida | null>;
}
