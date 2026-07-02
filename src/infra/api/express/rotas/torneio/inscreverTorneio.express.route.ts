import { NextFunction, Request, RequestHandler, Response } from "express";
import { InscreverTorneio } from "../../../../../casosDeUso/torneio/inscreverTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { inscricaoRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { inscreverTorneioSchema, torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class InscreverTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly inscreverTorneioServico: InscreverTorneio
  ) { }

  public static criar(inscreverTorneioServico: InscreverTorneio) {
    return new InscreverTorneioRota(
      "/torneio/:torneioId/inscrever",
      HttpMethod.POST,
      inscreverTorneioServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdParamSchema), inscricaoRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const usuarioId = request.usuario!.id;
        const torneioId = request.params.torneioId as string;
        const dados = validarBody(inscreverTorneioSchema, request.body ?? {}, response);
        if (!dados) return;

        const resultado = await this.inscreverTorneioServico.executar({
          torneioId,
          usuarioId,
        });

        response.status(201).json(resultado);
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
