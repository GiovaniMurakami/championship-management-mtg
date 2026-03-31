import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type LoginUsuarioInputDto = {
  email: string;
  senha: string;
};

export type LoginUsuarioOutputDto = {
  token: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    role: string;
    telefone?: string;
    nickMTGO?: string;
    nickArena?: string;
  };
};

export class LoginUsuario
  implements CasoDeUso<LoginUsuarioInputDto, LoginUsuarioOutputDto>
{
  private constructor(private readonly usuarioGateway: UsuarioGateway) {}

  public static criar(usuarioGateway: UsuarioGateway) {
    return new LoginUsuario(usuarioGateway);
  }

  public async executar(
    input: LoginUsuarioInputDto
  ): Promise<LoginUsuarioOutputDto> {
    const usuario = await this.usuarioGateway.buscarPorEmail(input.email);

    if (!usuario) {
      throw ErroPersonalizado.criar({
        mensagem: "Credenciais inválidas.",
        status: StatusErro.erroNaoAutorizado,
      });
    }

    const senhaValida = await bcrypt.compare(input.senha, usuario.senha);

    if (!senhaValida) {
      throw ErroPersonalizado.criar({
        mensagem: "Credenciais inválidas.",
        status: StatusErro.erroNaoAutorizado,
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw ErroPersonalizado.criar({
        mensagem: "Erro interno do servidor.",
        status: StatusErro.erroServidor,
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.role,
      },
      jwtSecret,
      { expiresIn: "30m" }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        telefone: usuario.telefone,
        nickMTGO: usuario.nickMTGO,
        nickArena: usuario.nickArena,
      },
    };
  }
}
