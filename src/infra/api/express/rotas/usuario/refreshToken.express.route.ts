import { NextFunction, Request, RequestHandler, Response } from "express";
import { RefreshToken } from "../../../../../casosDeUso/usuario/refreshToken";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class RefreshTokenRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly refreshTokenServico: RefreshToken
  ) {}

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
    return [autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const resultado = await this.refreshTokenServico.executar({
          usuarioId: request.usuario!.id,
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
