import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarLiga } from "../../../../../casosDeUso/liga/buscarLiga";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class BuscarLigaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarLigaServico: BuscarLiga
  ) { }

  public static criar(buscarLigaServico: BuscarLiga) {
    return new BuscarLigaRota("/liga/:id", HttpMethod.GET, buscarLigaServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(idParamSchema), publicReadRateLimiter];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const id = request.params.id as string;
        const resultado = await this.buscarLigaServico.executar({ id });
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
