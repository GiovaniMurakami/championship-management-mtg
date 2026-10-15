import { NextFunction, Request, RequestHandler, Response } from "express";
import { RegistrarVisualizacaoGaleria } from "../../../../../casosDeUso/galeria/registrarVisualizacaoGaleria";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { publicActionRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class RegistrarVisualizacaoGaleriaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly registrarVisualizacaoGaleriaServico: RegistrarVisualizacaoGaleria
  ) {}

  public static criar(registrarVisualizacaoGaleriaServico: RegistrarVisualizacaoGaleria) {
    return new RegistrarVisualizacaoGaleriaRota(
      "/galeria/visualizacao",
      HttpMethod.POST,
      registrarVisualizacaoGaleriaServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [publicActionRateLimiter];
  }

  public getHandler() {
    return async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.registrarVisualizacaoGaleriaServico.executar();
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
