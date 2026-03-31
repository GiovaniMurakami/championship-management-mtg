import { NextFunction, Request, RequestHandler, Response } from "express";
import { ExcluirTime } from "../../../../../casosDeUso/time/excluirTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class ExcluirTimeRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly excluirTimeServico: ExcluirTime
  ) {}

  public static criar(excluirTimeServico: ExcluirTime) {
    return new ExcluirTimeRota("/time/:id", HttpMethod.DELETE, excluirTimeServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [autenticarJwt]; }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const id = request.params.id as string;
        const requisitanteId = request.usuario!.id;
        const isAdmin = request.usuario!.role === "admin";

        const resultado = await this.excluirTimeServico.executar({ id, requisitanteId, isAdmin });
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
