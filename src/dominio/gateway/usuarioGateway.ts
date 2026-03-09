import { Usuario } from "../entidade/usuario";

export interface UsuarioGateway {
  salvar(usuario: Usuario): Promise<void>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
  atualizar(usuario: Usuario): Promise<void>;
}
