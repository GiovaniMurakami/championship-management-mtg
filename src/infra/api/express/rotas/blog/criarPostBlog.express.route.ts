import { NextFunction, Request, RequestHandler, Response } from "express";
import { CriarPostBlog } from "../../../../../casosDeUso/blog/criarPostBlog";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { criarPostBlogSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class CriarPostBlogRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly criarPostBlogServico: CriarPostBlog
  ) {}

  public static criar(criarPostBlogServico: CriarPostBlog) {
    return new CriarPostBlogRota("/blog/posts", HttpMethod.POST, criarPostBlogServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(criarPostBlogSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.criarPostBlogServico.executar({
          ...dados,
          autorId: request.usuario!.id,
          autorNome: request.usuario!.nome,
        });
        response.status(201).json({ post: resultado });
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
