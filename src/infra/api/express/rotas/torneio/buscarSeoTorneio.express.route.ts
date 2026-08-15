import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarSeoTorneio } from "../../../../../casosDeUso/torneio/buscarSeoTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { torneioReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class BuscarSeoTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarSeoTorneioServico: BuscarSeoTorneio
  ) { }

  public static criar(buscarSeoTorneioServico: BuscarSeoTorneio) {
    return new BuscarSeoTorneioRota(
      "/torneio/:torneioId/seo",
      HttpMethod.GET,
      buscarSeoTorneioServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdParamSchema), torneioReadRateLimiter];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const resultado = await this.buscarSeoTorneioServico.executar({
          torneioId: request.params.torneioId as string,
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
