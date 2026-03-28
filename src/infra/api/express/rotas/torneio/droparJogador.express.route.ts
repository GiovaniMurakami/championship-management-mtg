import { NextFunction, Request, RequestHandler, Response } from "express";
import { DroparJogador } from "../../../../../casosDeUso/torneio/droparJogador";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class DroparJogadorRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly droparJogadorServico: DroparJogador
  ) { }

  public static criar(droparJogadorServico: DroparJogador) {
    return new DroparJogadorRota(
      "/torneio/:torneioId/drop",
      HttpMethod.POST,
      droparJogadorServico
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
        const requisitanteId = request.usuario!.id;
        const torneioId = request.params.torneioId as string;

        const jogadorId = request.body.jogadorId ?? requisitanteId;

        const resultado = await this.droparJogadorServico.executar({
          torneioId,
          requisitanteId,
          jogadorId,
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
