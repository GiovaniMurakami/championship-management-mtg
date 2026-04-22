import { NextFunction, Request, RequestHandler, Response } from "express";
import { SairTime } from "../../../../../casosDeUso/time/sairTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class SairTimeRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly sairTimeServico: SairTime
  ) { }

  public static criar(sairTimeServico: SairTime) {
    return new SairTimeRota("/time/:id/sair", HttpMethod.POST, sairTimeServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt]; }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const resultado = await this.sairTimeServico.executar({
          timeId: request.params.id as string,
          usuarioId: request.usuario!.id,
        });

        response.status(200).json(resultado);
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          response.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}
