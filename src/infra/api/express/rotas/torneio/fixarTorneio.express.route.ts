import { NextFunction, Request, RequestHandler, Response } from "express";
import { FixarTorneio } from "../../../../../casosDeUso/torneio/fixarTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { torneioMutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class FixarTorneioRota implements Rotas {
  private constructor(
    private readonly caso: FixarTorneio,
    private readonly fixado: boolean,
  ) {}

  public static criar(caso: FixarTorneio, fixado: boolean) {
    return new FixarTorneioRota(caso, fixado);
  }

  getCaminho() {
    return "/torneio/:torneioId/fixar";
  }

  getMetodo() {
    return this.fixado ? HttpMethod.POST : HttpMethod.DELETE;
  }

  getMiddlewares(): RequestHandler[] {
    return [
      validarParamsMiddleware(torneioIdParamSchema),
      torneioMutationRateLimiter,
      autenticarJwt,
      autorizarAdmin,
    ];
  }

  getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.caso.executar({
          torneioId: String(request.params.torneioId),
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
