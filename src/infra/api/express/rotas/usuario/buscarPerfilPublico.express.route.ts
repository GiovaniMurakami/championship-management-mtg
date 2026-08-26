import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarPerfilPublico } from "../../../../../casosDeUso/usuario/buscarPerfilPublico";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class BuscarPerfilPublicoRota implements Rotas {
  private constructor(private readonly buscarPerfil: BuscarPerfilPublico) {}
  public static criar(buscarPerfil: BuscarPerfilPublico) { return new BuscarPerfilPublicoRota(buscarPerfil); }
  public getCaminho() { return "/usuario/:id/perfil"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] { return [validarParamsMiddleware(idParamSchema), publicReadRateLimiter]; }
  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
        response.status(200).json(await this.buscarPerfil.executar({ id }));
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
