import { NextFunction, Request, Response } from "express";
import { RegistrarPartidaExterna } from "../../../../../casosDeUso/usuario/registrarPartidaExterna";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { accountRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class RegistrarPartidaExternaRota implements Rotas {
  private constructor(private readonly caso: RegistrarPartidaExterna) {}
  public static criar(caso: RegistrarPartidaExterna) { return new RegistrarPartidaExternaRota(caso); }
  public getCaminho() { return "/usuario/partidas-externas"; }
  public getMetodo() { return HttpMethod.POST; }
  public getMiddlewares() { return [accountRateLimiter, autenticarJwt]; }
  public getHandler() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.usuario?.id) { res.status(401).json({ mensagem: "Usuário não autenticado." }); return; }
        res.status(201).json(await this.caso.executar(req.usuario.id, req.body));
      } catch (error) {
        if (error instanceof ErroPersonalizado) { res.status(error.status).json({ mensagem: error.message }); return; }
        next(error);
      }
    };
  }
}
