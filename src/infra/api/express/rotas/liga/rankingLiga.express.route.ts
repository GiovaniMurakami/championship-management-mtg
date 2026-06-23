import { NextFunction, Request, RequestHandler, Response } from "express";
import { RankingLiga } from "../../../../../casosDeUso/liga/rankingLiga";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class RankingLigaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly rankingLigaServico: RankingLiga
  ) { }

  public static criar(rankingLigaServico: RankingLiga) {
    return new RankingLigaRota("/liga/:id/ranking", HttpMethod.GET, rankingLigaServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(idParamSchema), publicReadRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const ligaId = request.params.id as string;
        const parseLimit = (val: unknown, max = 200) => {
          const n = Number(val);
          return Number.isInteger(n) && n > 0 ? Math.min(n, max) : 10;
        };
        const resultado = await this.rankingLigaServico.executar({
          ligaId,
          limiteJogadores: parseLimit(request.query.limiteJogadores),
          limiteTimes: parseLimit(request.query.limiteTimes),
          limiteDecks: parseLimit(request.query.limiteDecks),
          limiteCartas: parseLimit(request.query.limiteCartas),
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
