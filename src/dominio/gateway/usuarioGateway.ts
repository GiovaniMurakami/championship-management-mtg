import { Usuario } from "../entidade/usuario";

export class EmailUsuarioJaExisteErro extends Error {
  public constructor() {
    super("Email de usuario ja cadastrado");
    this.name = "EmailUsuarioJaExisteErro";
  }
}

export interface FiltrosListarUsuarios {
  nome?: string;
  bloqueadoTorneios?: boolean;
  excluido?: boolean;
  limite?: number;
  offset?: number;
}

export interface UsuarioGateway {
  salvar(usuario: Usuario): Promise<void>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarVarios(ids: string[]): Promise<Usuario[]>;
  listar(filtros?: FiltrosListarUsuarios): Promise<Usuario[]>;
  listarTotal(filtros?: Pick<FiltrosListarUsuarios, "nome" | "bloqueadoTorneios">): Promise<number>;
  atualizar(usuario: Usuario): Promise<void>;
  excluir(id: string): Promise<void>;
  incrementarResultadosExpressivos(ids: string[], incremento: number): Promise<void>;
}
