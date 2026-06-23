import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarRankingUsuarios } from "../../../../../casosDeUso/rank/listarRankingUsuarios";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { listarRankingUsuariosQuerySchema } from "../../../../../helpers/validacao/schemas";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { z } from "zod";

type ListarRankingQuery = z.infer<typeof listarRankingUsuariosQuerySchema>;

export class ListarRankingUsuariosRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarRankingUsuariosServico: ListarRankingUsuarios
  ) {}

  public static criar(listarRankingUsuariosServico: ListarRankingUsuarios) {
    return new ListarRankingUsuariosRota(
      "/usuario/ranking",
      HttpMethod.GET,
      listarRankingUsuariosServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarQueryMiddleware(listarRankingUsuariosQuerySchema), publicReadRateLimiter];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const { nome, limite, offset } = request.queryValidados as ListarRankingQuery;
        const resultado = await this.listarRankingUsuariosServico.executar({ nome, limite, offset });
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
