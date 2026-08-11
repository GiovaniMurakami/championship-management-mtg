import { v4 as uuidv4 } from "uuid";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { RefreshTokenGateway } from "../../dominio/gateway/refreshTokenGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { signToken } from "../../helpers/jwt";

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export type RefreshTokenInputDto = {
  refreshToken: string;
};

export type RefreshTokenOutputDto = {
  token: string;
  refreshToken: string;
};

export class RefreshToken
  implements CasoDeUso<RefreshTokenInputDto, RefreshTokenOutputDto> {
  private constructor(
    private readonly usuarioGateway: UsuarioGateway,
    private readonly refreshTokenGateway: RefreshTokenGateway
  ) { }

  public static criar(
    usuarioGateway: UsuarioGateway,
    refreshTokenGateway: RefreshTokenGateway
  ) {
    return new RefreshToken(usuarioGateway, refreshTokenGateway);
  }

  public async executar(
    input: RefreshTokenInputDto
  ): Promise<RefreshTokenOutputDto> {
    // Atomic consume: find-and-delete prevents race condition
    const dados = await this.refreshTokenGateway.consumir(input.refreshToken);

    if (!dados) {
      throw ErroPersonalizado.criar({
        mensagem: "Refresh token inválido ou expirado.",
        status: StatusErro.erroNaoAutorizado,
      });
    }

    const usuario = await this.usuarioGateway.buscarPorId(dados.usuarioId);

    if (!usuario) {
      throw ErroPersonalizado.criar({
        mensagem: "Sessão inválida.",
        status: StatusErro.erroNaoAutorizado,
      });
    }

    if (usuario.excluido) {
      throw ErroPersonalizado.criar({
        mensagem: "Esta conta foi excluída.",
        status: StatusErro.erroNaoAutorizado,
      });
    }

    const token = signToken(
      {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.role,
      },
      "30m"
    );

    if (!token) {
      throw ErroPersonalizado.criar({
        mensagem: "Erro interno do servidor.",
        status: StatusErro.erroServidor,
      });
    }

    const novoRefreshToken = uuidv4();
    await this.refreshTokenGateway.salvar({
      token: novoRefreshToken,
      usuarioId: usuario.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    return { token, refreshToken: novoRefreshToken };
  }
}
