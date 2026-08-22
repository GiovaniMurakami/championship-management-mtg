import { NextFunction, Request, RequestHandler, Response } from "express";
import { AlterarLiga } from "../../../../../casosDeUso/liga/alterarLiga";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { alterarLigaSchema, idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class AlterarLigaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly alterarLigaServico: AlterarLiga
  ) { }

  public static criar(alterarLigaServico: AlterarLiga) {
    return new AlterarLigaRota("/liga/:id", HttpMethod.PUT, alterarLigaServico);
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
        const dados = validarBody(alterarLigaSchema, request.body, response);
        if (!dados) return;

        const { nome, descricao, bannerUrl, torneioIds, tipo } = dados;

        const resultado = await this.alterarLigaServico.executar({
          id,
          requisitanteId,
          isAdmin: request.usuario!.role === "admin",
          nome,
          descricao,
          bannerUrl,
          torneioIds,
          tipo,
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
