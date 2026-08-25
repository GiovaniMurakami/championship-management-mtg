import { NextFunction, Request, RequestHandler, Response } from "express";
import { DroparJogadoresSemDeck } from "../../../../../casosDeUso/torneio/droparJogadoresSemDeck";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { torneioMutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class DroparJogadoresSemDeckRota implements Rotas {
  private constructor(private readonly servico: DroparJogadoresSemDeck) {}

  public static criar(servico: DroparJogadoresSemDeck) { return new DroparJogadoresSemDeckRota(servico); }
  public getCaminho(): string { return "/torneio/:torneioId/drop/sem-deck"; }
  public getMetodo(): HttpMethod { return HttpMethod.POST; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdParamSchema), torneioMutationRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.servico.executar({
          torneioId: request.params.torneioId as string,
          requisitanteId: request.usuario!.id,
          isAdmin: request.usuario!.role === "admin",
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
