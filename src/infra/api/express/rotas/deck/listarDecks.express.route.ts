import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  ListarDecks,
} from "../../../../../casosDeUso/deck/listarDecks";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class ListarDecksRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarDecksServico: ListarDecks
  ) { }

  public static criar(listarDecksServico: ListarDecks) {
    return new ListarDecksRota(
      "/deck/listar",
      HttpMethod.GET,
      listarDecksServico
    );
  }

  public getCaminho(): string {
    return this.caminho;
  }

  public getMetodo(): HttpMethod {
    return this.metodo;
  }

  public getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { usuarioId, formato, nome, criadoApos, criadoAntes, limite, offset } = request.query as Record<string, string | undefined>;

        const resultado = await this.listarDecksServico.executar({
          usuarioId,
          formato,
          nome,
          criadoApos,
          criadoAntes,
          limite: limite !== undefined ? Number(limite) : undefined,
          offset: offset !== undefined ? Number(offset) : undefined,
        });

        response.status(200).json(resultado);
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          response.status(error.status).json({
            mensagem: error.message,
            erros: error.erros,
          });
          return;
        }
        next(error);
      }
    };
  }
}
