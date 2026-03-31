import { NextFunction, Request, RequestHandler, Response } from "express";
import { AutocompletarCarta } from "../../../../../casosDeUso/scryfall/autocompletarCarta";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";

export class AutocompletarCartaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly autocompletarCartaServico: AutocompletarCarta
  ) {}

  public static criar(autocompletarCartaServico: AutocompletarCarta) {
    return new AutocompletarCartaRota("/scryfall/autocompletar", HttpMethod.GET, autocompletarCartaServico);
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
        const q = request.query.q as string;
        const resultado = await this.autocompletarCartaServico.executar({ q });
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
