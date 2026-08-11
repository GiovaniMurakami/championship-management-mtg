import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarStoryFundos } from "../../../../../casosDeUso/storyFundo/listarStoryFundos";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class ListarStoryFundosRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarStoryFundosServico: ListarStoryFundos
  ) {}

  public static criar(listarStoryFundosServico: ListarStoryFundos) {
    return new ListarStoryFundosRota("/story-fundo", HttpMethod.GET, listarStoryFundosServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter, autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.listarStoryFundosServico.executar();
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
