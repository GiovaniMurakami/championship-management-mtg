import { NextFunction, Request, RequestHandler, Response } from "express";
import { ValidarDecklist } from "../../../../../casosDeUso/scryfall/validarDecklist";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class ValidarDecklistRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly validarDecklistServico: ValidarDecklist
  ) {}

  public static criar(validarDecklistServico: ValidarDecklist) {
    return new ValidarDecklistRota("/scryfall/validar-deck", HttpMethod.POST, validarDecklistServico);
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
        const { cartas, formato } = request.body;

        if (!cartas) {
          response.status(400).json({ mensagem: "O campo 'cartas' é obrigatório." });
          return;
        }

        const resultado = await this.validarDecklistServico.executar({ cartas, formato });
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
