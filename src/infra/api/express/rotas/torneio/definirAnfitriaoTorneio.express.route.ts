import { NextFunction, Request, RequestHandler, Response } from "express";
import { DefinirAnfitriaoTorneio } from "../../../../../casosDeUso/torneio/definirAnfitriaoTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { torneioMutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { definirAnfitriaoTorneioSchema, torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class DefinirAnfitriaoTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly definirAnfitriaoTorneioServico: DefinirAnfitriaoTorneio
  ) { }

  public static criar(definirAnfitriaoTorneioServico: DefinirAnfitriaoTorneio) {
    return new DefinirAnfitriaoTorneioRota(
      "/torneio/:torneioId/anfitriao",
      HttpMethod.PUT,
      definirAnfitriaoTorneioServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdParamSchema), torneioMutationRateLimiter, autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const torneioId = request.params.torneioId as string;
        const dados = validarBody(definirAnfitriaoTorneioSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.definirAnfitriaoTorneioServico.executar({
          torneioId,
          anfitriaoId: dados.anfitriaoId,
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
