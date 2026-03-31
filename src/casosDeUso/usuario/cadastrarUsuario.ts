import bcrypt from "bcryptjs";
import { Usuario } from "../../dominio/entidade/usuario";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type CadastrarUsuarioInputDto = {
  nome: string;
  email: string;
  senha: string;
};

export type CadastrarUsuarioOutputDto = {
  id: string;
  nome: string;
  email: string;
  criadoEm: Date;
};

export class CadastrarUsuario
  implements CasoDeUso<CadastrarUsuarioInputDto, CadastrarUsuarioOutputDto>
{
  private constructor(private readonly usuarioGateway: UsuarioGateway) {}

  public static criar(usuarioGateway: UsuarioGateway) {
    return new CadastrarUsuario(usuarioGateway);
  }

  public async executar(
    input: CadastrarUsuarioInputDto
  ): Promise<CadastrarUsuarioOutputDto> {
    const usuarioExistente = await this.usuarioGateway.buscarPorEmail(
      input.email
    );

    if (usuarioExistente) {
      throw ErroPersonalizado.criar({
        mensagem: "E-mail já cadastrado.",
        status: StatusErro.erroParametro,
      });
    }

    const senhaHash = await bcrypt.hash(input.senha, 12);

    const usuario = Usuario.criar({
      nome: input.nome,
      email: input.email,
      senha: senhaHash,
    });

    await this.usuarioGateway.salvar(usuario);

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      criadoEm: usuario.criadoEm,
    };
  }
}
