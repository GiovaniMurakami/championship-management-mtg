import { Torneio, StatusTorneio } from "../entidade/torneio";
import { Partida } from "../entidade/partida";

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
  listar(filtros?: FiltrosListarTorneios): Promise<Torneio[]>;
  listarTotal(filtros?: Pick<FiltrosListarTorneios, 'incluirSecretos' | 'status' | 'nome' | 'dataInicio' | 'dataFim'>): Promise<number>;
  atualizar(torneio: Torneio): Promise<void>;
  incrementarVisualizacoes(id: string): Promise<Torneio | null>;
  /** Atualiza o torneio e cria as novas partidas numa operacao atomica. */
  atualizarECriarPartidas(torneio: Torneio, partidas: Partida[]): Promise<void>;
  excluir(id: string): Promise<void>;
  contarPorDono(donoId: string): Promise<number>;
  removerAnfitriaoDoUsuario(usuarioId: string): Promise<number>;
}
