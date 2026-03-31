import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarCarta } from "../../../../../casosDeUso/scryfall/buscarCarta";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";

export class BuscarCartaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarCartaServico: BuscarCarta
  ) {}

  public static criar(buscarCartaServico: BuscarCarta) {
    return new BuscarCartaRota("/scryfall/carta/:nome", HttpMethod.GET, buscarCartaServico);
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
        const nome = request.params.nome as string;
        const resultado = await this.buscarCartaServico.executar({ nome });
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
