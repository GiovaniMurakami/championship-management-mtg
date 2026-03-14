import { NextFunction, Request, RequestHandler, Response } from "express";
import { EscolherDeckTorneio } from "../../../../../casosDeUso/torneio/escolherDeckTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class EscolherDeckTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly escolherDeckTorneioServico: EscolherDeckTorneio
  ) {}

  public static criar(escolherDeckTorneioServico: EscolherDeckTorneio) {
    return new EscolherDeckTorneioRota(
      "/torneio/:torneioId/deck",
      HttpMethod.POST,
      escolherDeckTorneioServico
    );
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
        const usuarioId = request.usuario!.id;
        const torneioId = request.params.torneioId as string;
        const { deckId } = request.body;

        if (!deckId) {
          response.status(400).json({ mensagem: "deckId é obrigatório." });
          return;
        }

        const resultado = await this.escolherDeckTorneioServico.executar({
          torneioId,
          usuarioId,
          deckId,
        });

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
