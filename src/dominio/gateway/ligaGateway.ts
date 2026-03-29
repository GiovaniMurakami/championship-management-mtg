import { Liga } from "../entidade/liga";

export interface LigaGateway {
  salvar(liga: Liga): Promise<void>;
  buscarPorId(id: string): Promise<Liga | null>;
  listar(): Promise<Liga[]>;
  atualizar(liga: Liga): Promise<void>;
  excluir(id: string): Promise<void>;
}
