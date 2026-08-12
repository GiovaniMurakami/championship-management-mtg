import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarStandings } from "../../../../../casosDeUso/torneio/buscarStandings";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class BuscarStandingsRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarStandingsServico: BuscarStandings
  ) { }

  public static criar(buscarStandingsServico: BuscarStandings) {
    return new BuscarStandingsRota(
      "/torneio/:torneioId/standings",
      HttpMethod.GET,
      buscarStandingsServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdParamSchema), publicReadRateLimiter];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const torneioId = request.params.torneioId as string;

        const resultado = await this.buscarStandingsServico.executar({
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
