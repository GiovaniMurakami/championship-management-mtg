import jwt from "jsonwebtoken";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { TokenBlacklistGateway } from "../../dominio/gateway/tokenBlacklistGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type RefreshTokenInputDto = {
  usuarioId: string;
  tokenAtual: string;
};

export type RefreshTokenOutputDto = {
  token: string;
};

export class RefreshToken
  implements CasoDeUso<RefreshTokenInputDto, RefreshTokenOutputDto>
{
  private constructor(
    private readonly usuarioGateway: UsuarioGateway,
    private readonly tokenBlacklistGateway: TokenBlacklistGateway
  ) {}

  public static criar(
    usuarioGateway: UsuarioGateway,
    tokenBlacklistGateway: TokenBlacklistGateway
  ) {
    return new RefreshToken(usuarioGateway, tokenBlacklistGateway);
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

    await this.tokenBlacklistGateway.adicionar(input.tokenAtual, new Date(Date.now() + 30 * 60 * 1000));

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

    return { token };
  }
}
