import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarSeoArtigo } from "../../../../../casosDeUso/artigo/buscarSeoArtigo";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { artigoIdOuSlugParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class BuscarSeoArtigoRota implements Rotas {
  private constructor(private readonly servico: BuscarSeoArtigo) {}

  public static criar(servico: BuscarSeoArtigo) {
    return new BuscarSeoArtigoRota(servico);
  }

  public getCaminho() { return "/artigo/:artigoId/seo"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(artigoIdOuSlugParamSchema), publicReadRateLimiter];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        response.status(200).json(await this.servico.executar({
          artigoId: String(request.params.artigoId),
        }));
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
