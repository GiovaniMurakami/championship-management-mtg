import { Torneio } from "../entidade/torneio";

export interface TorneioGateway {
  salvar(torneio: Torneio): Promise<void>;
  buscarPorId(id: string): Promise<Torneio | null>;
  listar(): Promise<Torneio[]>;
  atualizar(torneio: Torneio): Promise<void>;
}
