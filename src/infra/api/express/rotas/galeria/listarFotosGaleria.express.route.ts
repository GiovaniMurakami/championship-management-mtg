import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarFotosGaleria } from "../../../../../casosDeUso/galeria/listarFotosGaleria";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class ListarFotosGaleriaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarFotosGaleriaServico: ListarFotosGaleria
  ) {}

  public static criar(listarFotosGaleriaServico: ListarFotosGaleria) {
    return new ListarFotosGaleriaRota("/galeria", HttpMethod.GET, listarFotosGaleriaServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter];
  }

  public getHandler() {
    return async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.listarFotosGaleriaServico.executar();
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
