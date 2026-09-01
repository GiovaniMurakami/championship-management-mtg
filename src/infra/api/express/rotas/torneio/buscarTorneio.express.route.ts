import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarTorneio } from "../../../../../casosDeUso/torneio/buscarTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { torneioReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { torneioIdOuSlugParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class BuscarTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarTorneioServico: BuscarTorneio
  ) { }

  public static criar(buscarTorneioServico: BuscarTorneio) {
    return new BuscarTorneioRota(
      "/torneio/:torneioId",
      HttpMethod.GET,
      buscarTorneioServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdOuSlugParamSchema), torneioReadRateLimiter];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const torneioId = request.params.torneioId as string;

        const resultado = await this.buscarTorneioServico.executar({
          torneioId,
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
