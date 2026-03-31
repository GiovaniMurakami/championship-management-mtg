import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarTime } from "../../../../../casosDeUso/time/buscarTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";

export class BuscarTimeRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarTimeServico: BuscarTime
  ) {}

  public static criar(buscarTimeServico: BuscarTime) {
    return new BuscarTimeRota("/time/:id", HttpMethod.GET, buscarTimeServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return []; }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const id = request.params.id as string;
        const resultado = await this.buscarTimeServico.executar({ id });
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
