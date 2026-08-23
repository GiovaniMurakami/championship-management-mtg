import { EntradaFilaRanqueada, EstadoRanqueado, PartidaRanqueada, PunicaoRanqueada, RankingRanqueado } from "../entidade/ranqueada";

export interface RanqueadaGateway {
  buscarRanking(jogadorId: string, formato: string): Promise<RankingRanqueado | null>;
  buscarEstado(jogadorId: string, formato: string): Promise<EstadoRanqueado | null>;
  buscarPartida(id: string): Promise<PartidaRanqueada | null>;
  buscarEntrada(jogadorId: string): Promise<EntradaFilaRanqueada | null>;
  listarFila(formato: string): Promise<EntradaFilaRanqueada[]>;
  entrarNaFila(entrada: EntradaFilaRanqueada, estado: EstadoRanqueado): Promise<void>;
  sairDaFila(entrada: EntradaFilaRanqueada): Promise<void>;
  abandonarCampanha(estado: EstadoRanqueado, entrada: EntradaFilaRanqueada | null): Promise<boolean>;
  parear(a: EntradaFilaRanqueada, b: EntradaFilaRanqueada, partida: PartidaRanqueada): Promise<boolean>;
  atualizarPartida(partida: PartidaRanqueada, statusEsperado: PartidaRanqueada["status"]): Promise<boolean>;
  contestarPartida(partida: PartidaRanqueada, estados: EstadoRanqueado[]): Promise<boolean>;
  finalizar(partida: PartidaRanqueada, rankings: RankingRanqueado[], estados: EstadoRanqueado[], statusEsperado: PartidaRanqueada["status"]): Promise<boolean>;
  listarRanking(formato: string): Promise<RankingRanqueado[]>;
  listarContestadas(): Promise<PartidaRanqueada[]>;
  listarAguardandoConfirmacao(): Promise<PartidaRanqueada[]>;
  listarHistorico(jogadorId: string): Promise<PartidaRanqueada[]>;
  buscarPunicao(jogadorId: string): Promise<PunicaoRanqueada | null>;
  salvarPunicao(punicao: PunicaoRanqueada, warningsEsperados: number): Promise<boolean>;
}
