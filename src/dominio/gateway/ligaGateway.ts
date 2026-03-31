import { Liga } from "../entidade/liga";

export interface FiltrosListarLigas {
  limite?: number;
  offset?: number;
}

export interface LigaGateway {
  salvar(liga: Liga): Promise<void>;
  buscarPorId(id: string): Promise<Liga | null>;
  listar(filtros?: FiltrosListarLigas): Promise<Liga[]>;
  listarTotal(): Promise<number>;
  atualizar(liga: Liga): Promise<void>;
  excluir(id: string): Promise<void>;
}
