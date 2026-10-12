import { NextFunction, Request, RequestHandler, Response } from "express";
import { FixarLiga } from "../../../../../casosDeUso/liga/fixarLiga";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class FixarLigaRota implements Rotas {
  private constructor(
    private readonly caso: FixarLiga,
    private readonly fixado: boolean,
  ) {}

  public static criar(caso: FixarLiga, fixado: boolean) {
    return new FixarLigaRota(caso, fixado);
  }

  getCaminho() {
    return "/liga/:id/fixar";
  }

  getMetodo() {
    return this.fixado ? HttpMethod.POST : HttpMethod.DELETE;
  }

  getMiddlewares(): RequestHandler[] {
    return [
      validarParamsMiddleware(idParamSchema),
      mutationRateLimiter,
      autenticarJwt,
      autorizarAdmin,
    ];
  }

  getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.caso.executar({
          ligaId: String(request.params.id),
          fixado: this.fixado,
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
