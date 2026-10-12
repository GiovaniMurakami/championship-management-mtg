import { Torneio, StatusTorneio } from "../entidade/torneio";

export interface FiltrosListarTorneios {
  limite?: number;
  offset?: number;
  incluirSecretos?: boolean;
  status?: StatusTorneio;
  nome?: string;
  dataInicio?: Date;
  dataFim?: Date;
  /** Default: mais antigo primeiro. Finalizados usam mais recente primeiro. */
  horarioDesc?: boolean;
}

export interface TorneioGateway {
  salvar(torneio: Torneio): Promise<void>;
  buscarPorId(id: string): Promise<Torneio | null>;
  buscarVarios(ids: string[]): Promise<Torneio[]>;
  buscarPorPrefixo(prefixo: string): Promise<Torneio | null>;
  listar(filtros?: FiltrosListarTorneios): Promise<Torneio[]>;
  listarTotal(filtros?: Pick<FiltrosListarTorneios, 'incluirSecretos' | 'status' | 'nome' | 'dataInicio' | 'dataFim'>): Promise<number>;
  atualizar(torneio: Torneio): Promise<void>;
  incrementarVisualizacoes(id: string): Promise<Torneio | null>;
  excluir(id: string): Promise<void>;
  contarPorDono(donoId: string): Promise<number>;
  removerAnfitriaoDoUsuario(usuarioId: string): Promise<number>;
}
