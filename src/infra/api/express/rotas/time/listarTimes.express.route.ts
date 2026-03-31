import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarTimes } from "../../../../../casosDeUso/time/listarTimes";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";

export class ListarTimesRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarTimesServico: ListarTimes
  ) {}

  public static criar(listarTimesServico: ListarTimes) {
    return new ListarTimesRota("/time/listar", HttpMethod.GET, listarTimesServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return []; }

  public getHandler() {
    return async (
      _request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const resultado = await this.listarTimesServico.executar({});
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
