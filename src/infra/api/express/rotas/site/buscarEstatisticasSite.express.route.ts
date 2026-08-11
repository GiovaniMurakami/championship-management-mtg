import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarEstatisticasSite } from "../../../../../casosDeUso/site/buscarEstatisticasSite";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class BuscarEstatisticasSiteRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarEstatisticasSiteServico: BuscarEstatisticasSite
  ) { }

  public static criar(buscarEstatisticasSiteServico: BuscarEstatisticasSite) {
    return new BuscarEstatisticasSiteRota("/site/estatisticas", HttpMethod.GET, buscarEstatisticasSiteServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter]; }

  public getHandler() {
    return async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.buscarEstatisticasSiteServico.executar();
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
