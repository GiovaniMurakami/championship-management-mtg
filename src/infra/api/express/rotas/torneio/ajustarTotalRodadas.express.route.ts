import { NextFunction, Request, RequestHandler, Response } from "express";
import { AjustarTotalRodadas } from "../../../../../casosDeUso/torneio/ajustarTotalRodadas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { eventosTorneio } from "../../../../socketio/eventosTorneio";
import { HttpMethod, Rotas } from "../rotas";
import {
  ajustarTotalRodadasSchema,
  torneioIdParamSchema,
} from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class AjustarTotalRodadasRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: AjustarTotalRodadas,
  ) {}

  public static criar(servico: AjustarTotalRodadas) {
    return new AjustarTotalRodadasRota(
      "/torneio/:torneioId/total-rodadas",
      HttpMethod.PUT,
      servico,
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
        const body = validarBody(ajustarTotalRodadasSchema, request.body, response);
        if (!body) return;

        const resultado = await this.servico.executar({
          torneioId,
          usuarioId: request.usuario!.id,
          isAdmin: request.usuario!.role === "admin",
          totalRodadas: body.totalRodadas,
        });

        eventosTorneio.emit("total_rodadas_alterado", resultado);
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
