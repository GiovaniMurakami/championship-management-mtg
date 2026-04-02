import { NextFunction, Request, RequestHandler, Response } from "express";
import { IniciarProximaRodada } from "../../../../../casosDeUso/torneio/iniciarProximaRodada";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { eventosTorneio } from "../../../../socketio/eventosTorneio";

export class IniciarProximaRodadaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly iniciarProximaRodadaServico: IniciarProximaRodada
  ) { }

  public static criar(iniciarProximaRodadaServico: IniciarProximaRodada) {
    return new IniciarProximaRodadaRota(
      "/torneio/:torneioId/proxima-rodada",
      HttpMethod.POST,
      iniciarProximaRodadaServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt]; }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const donoId = request.usuario!.id;
        const torneioId = request.params.torneioId as string;

        const resultado = await this.iniciarProximaRodadaServico.executar({
          torneioId,
          donoId,
          isAdmin: request.usuario!.role === "admin",
        });

        if (!resultado.finalizado) {
          eventosTorneio.emit("rodada_iniciada", {
            torneioId,
            rodadaAtual: resultado.rodadaAtual,
            partidas: resultado.partidas,
          });
        } else {
          eventosTorneio.emit("torneio_finalizado", {
            torneioId,
            classificacao: resultado.classificacao,
          });
        }

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
