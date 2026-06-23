import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarTime } from "../../../../../casosDeUso/time/buscarTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class BuscarTimeRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarTimeServico: BuscarTime
  ) { }

  public static criar(buscarTimeServico: BuscarTime) {
    return new BuscarTimeRota("/time/:id", HttpMethod.GET, buscarTimeServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [validarParamsMiddleware(idParamSchema), publicReadRateLimiter, autenticarJwt]; }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const resultado = await this.buscarTimeServico.executar({ id: request.params.id as string });
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
