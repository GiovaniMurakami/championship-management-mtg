import { NextFunction, Request, Response } from "express";
import {
  ListarDecks,
  ListarDecksInputDto,
} from "../../../../../casosDeUso/deck/listarDecks";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class ListarDecksRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarDecksServico: ListarDecks
  ) {}

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

  public getMiddlewares() {
    return [autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const usuarioId = request.usuario?.id;

        if (!usuarioId) {
          response.status(401).json({
            mensagem: "Usuário não autenticado.",
          });
          return;
        }

        const resultado = await this.listarDecksServico.executar({
          usuarioId,
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
