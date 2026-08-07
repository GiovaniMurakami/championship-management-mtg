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
}

export type AtualizarECriarPartidasOpcoes = {
  /**
   * Só aplica o update se rodadaAtual no banco ainda for este valor.
   * Retorna false se outra Lambda já avançou a rodada (lost race).
   */
  rodadaEsperada?: number;
  /** Só aplica se status atual for este (ex.: iniciar torneio). */
  statusEsperado?: StatusTorneio;
};

export interface TorneioGateway {
  salvar(torneio: Torneio): Promise<void>;
  buscarPorId(id: string): Promise<Torneio | null>;
  listar(filtros?: FiltrosListarTorneios): Promise<Torneio[]>;
  listarTotal(filtros?: Pick<FiltrosListarTorneios, 'incluirSecretos' | 'status' | 'nome' | 'dataInicio' | 'dataFim'>): Promise<number>;
  atualizar(torneio: Torneio): Promise<void>;
  /**
   * Atualiza torneio com filtro condicional (CAS).
   * Retorna false se o filtro não bater (concorrência).
   */
  atualizarSe(
    torneio: Torneio,
    filtro: { rodadaEsperada?: number; statusEsperado?: StatusTorneio }
  ): Promise<boolean>;
  incrementarVisualizacoes(id: string): Promise<Torneio | null>;
  /**
   * Atualiza torneio e cria novas partidas atomicamente numa transação MongoDB.
   * Com rodadaEsperada/statusEsperado, falha (false) se outra instância já alterou o estado.
   */
  atualizarECriarPartidas(
    torneio: Torneio,
    partidas: Partida[],
    opcoes?: AtualizarECriarPartidasOpcoes
  ): Promise<boolean>;
  excluir(id: string): Promise<void>;
}
