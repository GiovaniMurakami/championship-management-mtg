import { Torneio } from "../entidade/torneio";

export interface FiltrosListarTorneios {
  limite?: number;
  offset?: number;
}

export interface TorneioGateway {
  salvar(torneio: Torneio): Promise<void>;
  buscarPorId(id: string): Promise<Torneio | null>;
  listar(filtros?: FiltrosListarTorneios): Promise<Torneio[]>;
  listarTotal(): Promise<number>;
  atualizar(torneio: Torneio): Promise<void>;
}
