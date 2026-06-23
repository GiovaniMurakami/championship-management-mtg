import { NextFunction, Request, RequestHandler, Response } from "express";
import { AtualizarPareamentosRodada } from "../../../../../casosDeUso/torneio/atualizarPareamentosRodada";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { atualizarPareamentosRodadaSchema, torneioRodadaParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class AtualizarPareamentosRodadaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly atualizarPareamentosRodadaServico: AtualizarPareamentosRodada
  ) { }

  public static criar(atualizarPareamentosRodadaServico: AtualizarPareamentosRodada) {
    return new AtualizarPareamentosRodadaRota(
      "/torneio/:torneioId/rodada/:rodada/pareamentos",
      HttpMethod.PUT,
      atualizarPareamentosRodadaServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioRodadaParamSchema), mutationRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const dados = validarBody(atualizarPareamentosRodadaSchema, request.body, response);
        if (!dados) return;

        const torneioId = request.params.torneioId as string;
        const rodada = Number(request.params.rodada as string);

        const resultado = await this.atualizarPareamentosRodadaServico.executar({
          torneioId,
          rodada,
          requisitanteId: request.usuario!.id,
          isAdmin: request.usuario!.role === "admin",
          partidas: dados.partidas.map((partida) => ({
            id: partida.id,
            jogador1Id: partida.jogador1Id,
            jogador2Id: partida.jogador2Id ?? null,
            mesa: partida.mesa ?? null,
          })),
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
