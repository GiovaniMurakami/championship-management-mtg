import { NextFunction, Request, RequestHandler, Response } from "express";
import { SalvarAnuncios } from "../../../../../casosDeUso/site/salvarAnuncios";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class SalvarAnunciosRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly salvarAnunciosServico: SalvarAnuncios
  ) { }

  public static criar(salvarAnunciosServico: SalvarAnuncios) {
    return new SalvarAnunciosRota("/site/anuncios", HttpMethod.PUT, salvarAnunciosServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt, autorizarAdmin]; }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.salvarAnunciosServico.executar({
          anuncios: request.body?.anuncios,
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
