import { NextFunction, Request, RequestHandler, Response } from "express";
import { RefreshToken } from "../../../../../casosDeUso/usuario/refreshToken";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import {
  clearRefreshCookie,
  lerRefreshCookie,
  setRefreshCookie,
} from "../../../../../helpers/auth/refreshCookie";
import { refreshTokenRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { refreshTokenSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { StatusErro } from "../../../../../helpers/error/statusErro";

export class RefreshTokenRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly refreshTokenServico: RefreshToken
  ) { }

  public static criar(refreshTokenServico: RefreshToken) {
    return new RefreshTokenRota(
      "/usuario/refresh-token",
      HttpMethod.POST,
      refreshTokenServico
    );
  }

  public getCaminho(): string {
    return this.caminho;
  }

  public getMetodo(): HttpMethod {
    return this.metodo;
  }

  public getMiddlewares(): RequestHandler[] {
    return [refreshTokenRateLimiter];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const dados = validarBody(refreshTokenSchema, request.body ?? {}, response);
        if (!dados) return;

        const doCookie = lerRefreshCookie(request.cookies);
        const doBody = typeof dados.refreshToken === "string" ? dados.refreshToken.trim() : "";
        const refreshToken = doCookie || doBody;

        if (!refreshToken) {
          clearRefreshCookie(response);
          response.status(StatusErro.erroNaoAutorizado).json({
            mensagem: "Refresh token inválido ou expirado.",
          });
          return;
        }

        const resultado = await this.refreshTokenServico.executar({ refreshToken });

        setRefreshCookie(response, resultado.refreshToken);
        response.status(200).json({ token: resultado.token });
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          if (error.status === StatusErro.erroNaoAutorizado) {
            clearRefreshCookie(response);
          }
          response.status(error.status).json({
            mensagem: error.message,
            erros: error.erros,
          });
          return;
        }
        next(error);
      }
    };
  }
}
