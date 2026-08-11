import { NextFunction, Request, RequestHandler, Response } from "express";
import { ExcluirStoryFundo } from "../../../../../casosDeUso/storyFundo/excluirStoryFundo";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class ExcluirStoryFundoRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly excluirStoryFundoServico: ExcluirStoryFundo
  ) {}

  public static criar(excluirStoryFundoServico: ExcluirStoryFundo) {
    return new ExcluirStoryFundoRota("/story-fundo/:id", HttpMethod.DELETE, excluirStoryFundoServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(idParamSchema), mutationRateLimiter, autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const id = request.params.id as string;
        const resultado = await this.excluirStoryFundoServico.executar({ id });
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
