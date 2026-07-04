import { NextFunction, Request, RequestHandler, Response } from "express";
import { ImportarPostsWordpress } from "../../../../../casosDeUso/blog/importarPostsWordpress";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class ImportarPostsWordpressRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly importarPostsWordpressServico: ImportarPostsWordpress
  ) {}

  public static criar(importarPostsWordpressServico: ImportarPostsWordpress) {
    return new ImportarPostsWordpressRota("/blog/posts/importar-wordpress", HttpMethod.POST, importarPostsWordpressServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.importarPostsWordpressServico.executar();
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
