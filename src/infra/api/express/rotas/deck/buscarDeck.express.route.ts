import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarDeck } from "../../../../../casosDeUso/deck/buscarDeck";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { autenticarJwtOpcional } from "../../../../../middlewares/express/autenticarJwtOpcional";

export class BuscarDeckRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly buscarDeckServico: BuscarDeck
  ) { }

  public static criar(buscarDeckServico: BuscarDeck) {
    return new BuscarDeckRota("/deck/:id", HttpMethod.GET, buscarDeckServico);
  }

  public getCaminho(): string {
    return this.caminho;
  }

  public getMetodo(): HttpMethod {
    return this.metodo;
  }

  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(idParamSchema), publicReadRateLimiter, autenticarJwtOpcional];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { id } = request.params;
        const deckId = Array.isArray(id) ? id[0] : id;

        const resultado = await this.buscarDeckServico.executar({
          id: deckId,
          usuarioId: request.usuario?.id,
          isAdmin: request.usuario?.role === "admin",
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
