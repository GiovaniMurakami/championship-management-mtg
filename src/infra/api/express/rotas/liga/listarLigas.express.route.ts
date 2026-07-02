import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarLigas } from "../../../../../casosDeUso/liga/listarLigas";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { listarLigasQuerySchema } from "../../../../../helpers/validacao/schemas";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { z } from "zod";

type ListarLigasQuery = z.infer<typeof listarLigasQuerySchema>;

export class ListarLigasRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarLigasServico: ListarLigas
  ) { }

  public static criar(listarLigasServico: ListarLigas) {
    return new ListarLigasRota("/liga/listar", HttpMethod.GET, listarLigasServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarQueryMiddleware(listarLigasQuerySchema), publicReadRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { limite, offset, tipo, nome } = request.queryValidados as ListarLigasQuery;
        const resultado = await this.listarLigasServico.executar({
          limite,
          offset,
          tipo,
          nome,
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
