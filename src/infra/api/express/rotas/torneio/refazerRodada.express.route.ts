import { NextFunction, Request, RequestHandler, Response } from "express";
import { RefazerRodada } from "../../../../../casosDeUso/torneio/refazerRodada";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { eventosTorneio } from "../../../../socketio/eventosTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class RefazerRodadaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly refazerRodadaServico: RefazerRodada,
  ) {}

  public static criar(refazerRodadaServico: RefazerRodada) {
    return new RefazerRodadaRota(
      "/torneio/:torneioId/refazer-rodada",
      HttpMethod.POST,
      refazerRodadaServico,
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdParamSchema), mutationRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const torneioId = request.params.torneioId as string;
        const resultado = await this.refazerRodadaServico.executar({
          torneioId,
          donoId: request.usuario!.id,
          isAdmin: request.usuario!.role === "admin",
        });

        eventosTorneio.emit("rodada_refeita", {
          torneioId,
          ...resultado,
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
