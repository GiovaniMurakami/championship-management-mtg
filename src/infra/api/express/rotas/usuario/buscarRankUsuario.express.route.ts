import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarRankUsuario } from "../../../../../casosDeUso/rank/buscarRankUsuario";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { usuarioIdRankParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class BuscarRankUsuarioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarRankUsuarioServico: BuscarRankUsuario
  ) {}

  public static criar(buscarRankUsuarioServico: BuscarRankUsuario) {
    return new BuscarRankUsuarioRota(
      "/usuario/rank/:usuarioId",
      HttpMethod.GET,
      buscarRankUsuarioServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(usuarioIdRankParamSchema), publicReadRateLimiter];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const { usuarioId } = request.paramsValidados as { usuarioId: string };
        const resultado = await this.buscarRankUsuarioServico.executar({ usuarioId });
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
