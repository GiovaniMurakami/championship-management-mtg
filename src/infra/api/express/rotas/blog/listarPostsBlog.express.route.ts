import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarPostsBlog } from "../../../../../casosDeUso/blog/listarPostsBlog";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { listarPostsBlogQuerySchema } from "../../../../../helpers/validacao/schemas";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";
import { z } from "zod";

type ListarPostsBlogQuery = z.infer<typeof listarPostsBlogQuerySchema>;

export class ListarPostsBlogRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarPostsBlogServico: ListarPostsBlog
  ) {}

  public static criar(listarPostsBlogServico: ListarPostsBlog) {
    return new ListarPostsBlogRota("/blog/posts", HttpMethod.GET, listarPostsBlogServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarQueryMiddleware(listarPostsBlogQuerySchema), publicReadRateLimiter];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const { limite, offset } = request.queryValidados as ListarPostsBlogQuery;
        const resultado = await this.listarPostsBlogServico.executar({ limite, offset });
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
