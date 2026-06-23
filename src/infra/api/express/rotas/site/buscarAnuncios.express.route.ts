import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarAnuncios } from "../../../../../casosDeUso/site/buscarAnuncios";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class BuscarAnunciosRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarAnunciosServico: BuscarAnuncios
  ) { }

  public static criar(buscarAnunciosServico: BuscarAnuncios) {
    return new BuscarAnunciosRota("/site/anuncios", HttpMethod.GET, buscarAnunciosServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter]; }

  public getHandler() {
    return async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.buscarAnunciosServico.executar();
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
