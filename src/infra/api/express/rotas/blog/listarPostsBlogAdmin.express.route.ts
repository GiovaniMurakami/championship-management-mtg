import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarPostsBlogAdmin } from "../../../../../casosDeUso/blog/listarPostsBlog";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { listarPostsBlogQuerySchema } from "../../../../../helpers/validacao/schemas";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";
import { z } from "zod";

type ListarPostsBlogQuery = z.infer<typeof listarPostsBlogQuerySchema>;

export class ListarPostsBlogAdminRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarPostsBlogAdminServico: ListarPostsBlogAdmin
  ) {}

  public static criar(listarPostsBlogAdminServico: ListarPostsBlogAdmin) {
    return new ListarPostsBlogAdminRota("/blog/posts/admin/listar", HttpMethod.GET, listarPostsBlogAdminServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarQueryMiddleware(listarPostsBlogQuerySchema), publicReadRateLimiter, autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const { limite, offset } = request.queryValidados as ListarPostsBlogQuery;
        const resultado = await this.listarPostsBlogAdminServico.executar({ limite, offset });
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
