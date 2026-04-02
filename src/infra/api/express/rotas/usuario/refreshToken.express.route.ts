import { NextFunction, Request, RequestHandler, Response } from "express";
import { RefreshToken } from "../../../../../casosDeUso/usuario/refreshToken";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { refreshTokenRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { refreshTokenSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

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
        const dados = validarBody(refreshTokenSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.refreshTokenServico.executar({
          refreshToken: dados.refreshToken,
        });

        response.status(200).json(resultado);
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
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
