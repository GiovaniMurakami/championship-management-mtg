import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  AtualizarDeck,
} from "../../../../../casosDeUso/deck/atualizarDeck";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { atualizarDeckSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class AtualizarDeckRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly atualizarDeckServico: AtualizarDeck
  ) { }

  public static criar(atualizarDeckServico: AtualizarDeck) {
    return new AtualizarDeckRota(
      "/deck/:id",
      HttpMethod.PUT,
      atualizarDeckServico
    );
  }

  public getCaminho(): string {
    return this.caminho;
  }

  public getMetodo(): HttpMethod {
    return this.metodo;
  }

  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt];
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
        const usuarioNome = request.usuario!.nome;
        const dados = validarBody(atualizarDeckSchema, request.body, response);
        if (!dados) return;

        const { nome, nomeConsolidado, formato, linkLigaMagic, maindeck, sideboard, commander } = dados;

        const resultado = await this.atualizarDeckServico.executar({
          id,
          usuarioIdRequisitante,
          isAdmin: request.usuario!.role === "admin",
          usuarioNome,
          nome,
          nomeConsolidado,
          formato,
          linkLigaMagic,
          maindeck,
          sideboard,
          commander,
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
