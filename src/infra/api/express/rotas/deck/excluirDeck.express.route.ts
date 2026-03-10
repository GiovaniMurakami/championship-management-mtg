import { NextFunction, Request, RequestHandler, Response } from "express";
import { ExcluirDeck } from "../../../../../casosDeUso/deck/excluirDeck";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class ExcluirDeckRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly excluirDeckServico: ExcluirDeck
  ) {}

  public static criar(excluirDeckServico: ExcluirDeck) {
    return new ExcluirDeckRota(
      "/deck/:id",
      HttpMethod.DELETE,
      excluirDeckServico
    );
  }

  public getCaminho(): string {
    return this.caminho;
  }

  public getMetodo(): HttpMethod {
    return this.metodo;
  }

  public getMiddlewares(): RequestHandler[] {
    return [autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const id = request.params.id as string;
        const usuarioIdRequisitante = request.usuario!.id;

        const resultado = await this.excluirDeckServico.executar({
          id,
          usuarioIdRequisitante,
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
