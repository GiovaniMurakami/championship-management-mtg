import { Partida } from "../entidade/partida";

export interface PartidaGateway {
  salvar(partida: Partida): Promise<void>;
  salvarVarias(partidas: Partida[]): Promise<void>;
  buscarPorId(id: string): Promise<Partida | null>;
  listarPorTorneio(torneioId: string): Promise<Partida[]>;
  listarPorTorneioERodada(
    torneioId: string,
    rodada: number
  ): Promise<Partida[]>;
  atualizar(partida: Partida): Promise<void>;
}
