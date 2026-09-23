import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarMeuUsuario } from "../../../../../casosDeUso/usuario/buscarMeuUsuario";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class BuscarMeuUsuarioRota implements Rotas {
  private constructor(private readonly caso: BuscarMeuUsuario) {}

  public static criar(caso: BuscarMeuUsuario) {
    return new BuscarMeuUsuarioRota(caso);
  }

  public getCaminho() { return "/usuario/me"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const usuarioId = request.usuario?.id;
        if (!usuarioId) {
          response.status(401).json({ mensagem: "Usuário não autenticado." });
          return;
        }
        response.status(200).json(await this.caso.executar({ id: usuarioId }));
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
