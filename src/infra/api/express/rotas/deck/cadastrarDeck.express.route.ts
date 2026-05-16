import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  CadastrarDeck,
} from "../../../../../casosDeUso/deck/cadastrarDeck";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { deckRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { cadastrarDeckSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class CadastrarDeckRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly cadastrarDeckServico: CadastrarDeck
  ) { }

  public static criar(cadastrarDeckServico: CadastrarDeck) {
    return new CadastrarDeckRota(
      "/deck/cadastrar",
      HttpMethod.POST,
      cadastrarDeckServico
    );
  }

  public getCaminho(): string {
    return this.caminho;
  }

  public getMetodo(): HttpMethod {
    return this.metodo;
  }

  public getMiddlewares(): RequestHandler[] {
    return [deckRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const usuarioId = request.usuario!.id;
        const usuarioNome = request.usuario!.nome;
        const dados = validarBody(cadastrarDeckSchema, request.body, response);
        if (!dados) return;

        const { nome, formato, maindeck, sideboard, commander } = dados;

        const resultado = await this.cadastrarDeckServico.executar({
          nome,
          formato,
          maindeck,
          sideboard: sideboard ?? [],
          commander,
          usuarioId,
          usuarioNome,
        });

        response.status(201).json(resultado);
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
