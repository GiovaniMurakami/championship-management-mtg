import { Torneio, StatusTorneio } from "../entidade/torneio";
import { Partida } from "../entidade/partida";

export interface FiltrosListarTorneios {
  limite?: number;
  offset?: number;
  incluirSecretos?: boolean;
  status?: StatusTorneio;
  nome?: string;
}

export interface TorneioGateway {
  salvar(torneio: Torneio): Promise<void>;
  buscarPorId(id: string): Promise<Torneio | null>;
  listar(filtros?: FiltrosListarTorneios): Promise<Torneio[]>;
  listarTotal(filtros?: Pick<FiltrosListarTorneios, 'incluirSecretos' | 'status' | 'nome'>): Promise<number>;
  atualizar(torneio: Torneio): Promise<void>;
  /** Atualiza torneio e cria novas partidas atomicamente numa transação MongoDB. */
  atualizarECriarPartidas(torneio: Torneio, partidas: Partida[]): Promise<void>;
  excluir(id: string): Promise<void>;
}
