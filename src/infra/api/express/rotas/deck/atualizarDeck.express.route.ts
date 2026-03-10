import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  AtualizarDeck,
  AtualizarDeckInputDto,
} from "../../../../../casosDeUso/deck/atualizarDeck";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class AtualizarDeckRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly atualizarDeckServico: AtualizarDeck
  ) {}

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
        const { nome, formato, maindeck, sideboard } =
          request.body as Omit<AtualizarDeckInputDto, "id" | "usuarioIdRequisitante">;

        const resultado = await this.atualizarDeckServico.executar({
          id,
          usuarioIdRequisitante,
          nome,
          formato,
          maindeck,
          sideboard,
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
