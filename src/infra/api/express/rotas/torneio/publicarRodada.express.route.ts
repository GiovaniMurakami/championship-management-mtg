import { NextFunction, Request, RequestHandler, Response } from "express";
import { PublicarRodada } from "../../../../../casosDeUso/torneio/publicarRodada";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { torneioMutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";
import { torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class PublicarRodadaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly publicarRodadaServico: PublicarRodada,
  ) {}

  public static criar(publicarRodadaServico: PublicarRodada) {
    return new PublicarRodadaRota(
      "/torneio/:torneioId/publicar-rodada",
      HttpMethod.POST,
      publicarRodadaServico,
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdParamSchema), torneioMutationRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.publicarRodadaServico.executar({
          torneioId: request.params.torneioId as string,
          donoId: request.usuario!.id,
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
