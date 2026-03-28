import jwt from "jsonwebtoken";
import { TokenBlacklistGateway } from "../../dominio/gateway/tokenBlacklistGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type LogoutUsuarioInputDto = { token: string };
export type LogoutUsuarioOutputDto = { mensagem: string };

export class LogoutUsuario
  implements CasoDeUso<LogoutUsuarioInputDto, LogoutUsuarioOutputDto>
{
  private constructor(private readonly blacklistGateway: TokenBlacklistGateway) {}

  public static criar(blacklistGateway: TokenBlacklistGateway) {
    return new LogoutUsuario(blacklistGateway);
  }

  public async executar({ token }: LogoutUsuarioInputDto): Promise<LogoutUsuarioOutputDto> {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw ErroPersonalizado.criar({
        mensagem: "Erro interno do servidor.",
        status: StatusErro.erroServidor,
      });
    }

    let expiresAt: Date;
    try {
      const payload = jwt.verify(token, jwtSecret) as { exp?: number };
      expiresAt = payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    } catch {
      throw ErroPersonalizado.criar({
        mensagem: "Token inválido ou expirado.",
        status: StatusErro.erroNaoAutorizado,
      });
    }

    await this.blacklistGateway.adicionar(token, expiresAt);
    return { mensagem: "Logout realizado com sucesso." };
  }
}
