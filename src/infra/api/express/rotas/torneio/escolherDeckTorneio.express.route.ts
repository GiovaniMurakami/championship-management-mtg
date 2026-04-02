import { NextFunction, Request, RequestHandler, Response } from "express";
import { EscolherDeckTorneio } from "../../../../../casosDeUso/torneio/escolherDeckTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { inscricaoRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { escolherDeckTorneioSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class EscolherDeckTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly escolherDeckTorneioServico: EscolherDeckTorneio
  ) { }

  public static criar(escolherDeckTorneioServico: EscolherDeckTorneio) {
    return new EscolherDeckTorneioRota(
      "/torneio/:torneioId/deck",
      HttpMethod.POST,
      escolherDeckTorneioServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [inscricaoRateLimiter, autenticarJwt]; }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const isAdmin = request.usuario!.role === "admin";
        const torneioId = request.params.torneioId as string;
        const dados = validarBody(escolherDeckTorneioSchema, request.body, response);
        if (!dados) return;

        const { deckId, jogadorId } = dados;

        const usuarioId = isAdmin && jogadorId ? jogadorId : request.usuario!.id;
        const usuarioNome = request.usuario!.nome;

        const resultado = await this.escolherDeckTorneioServico.executar({
          torneioId,
          usuarioId,
          usuarioNome,
          isAdmin,
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
