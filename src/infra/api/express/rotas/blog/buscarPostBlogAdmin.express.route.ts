import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarPostBlogAdmin } from "../../../../../casosDeUso/blog/buscarPostBlog";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class BuscarPostBlogAdminRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarPostBlogAdminServico: BuscarPostBlogAdmin
  ) {}

  public static criar(buscarPostBlogAdminServico: BuscarPostBlogAdmin) {
    return new BuscarPostBlogAdminRota("/blog/posts/admin/:id", HttpMethod.GET, buscarPostBlogAdminServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(idParamSchema), publicReadRateLimiter, autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const id = request.params.id as string;
        const resultado = await this.buscarPostBlogAdminServico.executar({ id });
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
