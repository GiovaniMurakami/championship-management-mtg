import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarPostBlog } from "../../../../../casosDeUso/blog/buscarPostBlog";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { slugParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class BuscarPostBlogRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarPostBlogServico: BuscarPostBlog
  ) {}

  public static criar(buscarPostBlogServico: BuscarPostBlog) {
    return new BuscarPostBlogRota("/blog/posts/:slug", HttpMethod.GET, buscarPostBlogServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(slugParamSchema), publicReadRateLimiter];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const slug = request.params.slug as string;
        const resultado = await this.buscarPostBlogServico.executar({ slug });
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
