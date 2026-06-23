import { NextFunction, Request, RequestHandler, Response } from "express";
import { ExcluirTorneio } from "../../../../../casosDeUso/torneio/excluirTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class ExcluirTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly excluirTorneioServico: ExcluirTorneio
  ) { }

  public static criar(excluirTorneioServico: ExcluirTorneio) {
    return new ExcluirTorneioRota("/torneio/:id", HttpMethod.DELETE, excluirTorneioServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(idParamSchema), mutationRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const id = request.params.id as string;
        const requisitanteId = request.usuario!.id;

        const resultado = await this.excluirTorneioServico.executar({
          id,
          requisitanteId,
          isAdmin: request.usuario!.role === "admin",
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
