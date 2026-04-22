import { NextFunction, Request, RequestHandler, Response } from "express";
import { AlterarTime } from "../../../../../casosDeUso/time/alterarTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { alterarTimeSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class AlterarTimeRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly alterarTimeServico: AlterarTime
  ) { }

  public static criar(alterarTimeServico: AlterarTime) {
    return new AlterarTimeRota("/time/:id", HttpMethod.PUT, alterarTimeServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt]; }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const id = request.params.id as string;
        const requisitanteId = request.usuario!.id;
        const dados = validarBody(alterarTimeSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.alterarTimeServico.executar({
          id,
          requisitanteId,
          isAdmin: request.usuario!.role === "admin",
          nome: dados.nome,
          descricao: dados.descricao,
          imagemUrl: dados.imagemUrl,
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
