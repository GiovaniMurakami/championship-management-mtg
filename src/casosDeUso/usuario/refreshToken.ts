import jwt from "jsonwebtoken";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type RefreshTokenInputDto = {
  usuarioId: string;
};

export type RefreshTokenOutputDto = {
  token: string;
};

export class RefreshToken
  implements CasoDeUso<RefreshTokenInputDto, RefreshTokenOutputDto>
{
  private constructor(private readonly usuarioGateway: UsuarioGateway) {}

  public static criar(usuarioGateway: UsuarioGateway) {
    return new RefreshToken(usuarioGateway);
  }

  public async executar(
    input: RefreshTokenInputDto
  ): Promise<RefreshTokenOutputDto> {
    const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);

    if (!usuario) {
      throw ErroPersonalizado.criar({
        mensagem: "Usuário não encontrado.",
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
      { expiresIn: "24h" }
    );

    return { token };
  }
}
