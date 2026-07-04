import { NextFunction, Request, RequestHandler, Response } from "express";
import { AlterarPostBlog } from "../../../../../casosDeUso/blog/criarPostBlog";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { alterarPostBlogSchema, idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class AlterarPostBlogRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly alterarPostBlogServico: AlterarPostBlog
  ) {}

  public static criar(alterarPostBlogServico: AlterarPostBlog) {
    return new AlterarPostBlogRota("/blog/posts/:id", HttpMethod.PUT, alterarPostBlogServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, validarParamsMiddleware(idParamSchema), autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(alterarPostBlogSchema, request.body, response);
        if (!dados) return;

        const id = request.params.id as string;
        const resultado = await this.alterarPostBlogServico.executar({ id, ...dados });
        response.status(200).json({ post: resultado });
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
