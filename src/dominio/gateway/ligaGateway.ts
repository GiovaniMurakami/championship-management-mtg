import { Liga, TipoLiga } from "../entidade/liga";

export interface FiltrosListarLigas {
  limite?: number;
  offset?: number;
  tipo?: TipoLiga;
  nome?: string;
}

export interface LigaGateway {
  salvar(liga: Liga): Promise<void>;
  buscarPorId(id: string): Promise<Liga | null>;
  listar(filtros?: FiltrosListarLigas): Promise<Liga[]>;
  listarTotal(filtros?: Pick<FiltrosListarLigas, 'tipo' | 'nome'>): Promise<number>;
  buscarPorTorneioIds(torneioIds: string[]): Promise<Liga[]>;
  atualizar(liga: Liga): Promise<void>;
  excluir(id: string): Promise<void>;
}
