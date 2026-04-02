import jwt from "jsonwebtoken";
import { TokenBlacklistGateway } from "../../dominio/gateway/tokenBlacklistGateway";
import { RefreshTokenGateway } from "../../dominio/gateway/refreshTokenGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { verifyToken } from "../../helpers/jwt";

export type LogoutUsuarioInputDto = { token: string; usuarioId: string };
export type LogoutUsuarioOutputDto = { mensagem: string };

export class LogoutUsuario
  implements CasoDeUso<LogoutUsuarioInputDto, LogoutUsuarioOutputDto> {
  private constructor(
    private readonly blacklistGateway: TokenBlacklistGateway,
    private readonly refreshTokenGateway: RefreshTokenGateway
  ) { }

  public static criar(
    blacklistGateway: TokenBlacklistGateway,
    refreshTokenGateway: RefreshTokenGateway
  ) {
    return new LogoutUsuario(blacklistGateway, refreshTokenGateway);
  }

  public async executar({ token, usuarioId }: LogoutUsuarioInputDto): Promise<LogoutUsuarioOutputDto> {
    const payload = verifyToken(token);
    if (!payload) {
      throw ErroPersonalizado.criar({
        mensagem: "Token inválido ou expirado.",
        status: StatusErro.erroNaoAutorizado,
      });
    }

    const decoded = jwt.decode(token) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 30 * 60 * 1000);

    await this.blacklistGateway.adicionar(token, expiresAt);
    await this.refreshTokenGateway.excluirPorUsuario(usuarioId);
    return { mensagem: "Logout realizado com sucesso." };
  }
}
