import { Usuario } from "../entidade/usuario";

export interface UsuarioGateway {
  salvar(usuario: Usuario): Promise<void>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarVarios(ids: string[]): Promise<Usuario[]>;
  atualizar(usuario: Usuario): Promise<void>;
  incrementarResultadosExpressivos(ids: string[], incremento: number): Promise<void>;
  incrementarPontosRank(alteracoes: Array<{ id: string; delta: number }>): Promise<void>;
  listarRanking(
    limite: number,
    offset: number,
    nome?: string
  ): Promise<{ usuarios: Usuario[]; total: number }>;
}
