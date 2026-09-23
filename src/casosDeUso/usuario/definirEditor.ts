import { RoleUsuario } from "../../dominio/entidade/usuario";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type DefinirEditorInputDto = {
  usuarioId: string;
  editor: boolean;
};

export type DefinirEditorOutputDto = {
  id: string;
  nome: string;
  email: string;
  role: RoleUsuario;
};

export class DefinirEditor implements CasoDeUso<DefinirEditorInputDto, DefinirEditorOutputDto> {
  private constructor(private readonly usuarioGateway: UsuarioGateway) {}

  public static criar(usuarioGateway: UsuarioGateway) {
    return new DefinirEditor(usuarioGateway);
  }

  public async executar(input: DefinirEditorInputDto): Promise<DefinirEditorOutputDto> {
    const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);
    if (!usuario) {
      throw ErroPersonalizado.criar({
        mensagem: "Usuário não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }
    if (usuario.role === "admin") {
      throw ErroPersonalizado.criar({
        mensagem: "Não é possível alterar o papel de um administrador.",
        status: StatusErro.erroParametro,
      });
    }
    usuario.role = input.editor ? "editor" : "user";
    await this.usuarioGateway.atualizar(usuario);
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
    };
  }
}
