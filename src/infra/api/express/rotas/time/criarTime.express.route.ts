import { NextFunction, Request, RequestHandler, Response } from "express";
import { CriarTime } from "../../../../../casosDeUso/time/criarTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { criarTimeSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class CriarTimeRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly criarTimeServico: CriarTime
  ) { }

  public static criar(criarTimeServico: CriarTime) {
    return new CriarTimeRota("/time/criar", HttpMethod.POST, criarTimeServico);
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
        const donoId = request.usuario!.id;
        const dados = validarBody(criarTimeSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.criarTimeServico.executar({
          nome: dados.nome,
          descricao: dados.descricao,
          donoId,
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
