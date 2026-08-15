import { NextFunction, Request, RequestHandler, Response } from "express";
import { IniciarProximaRodada } from "../../../../../casosDeUso/torneio/iniciarProximaRodada";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { torneioMutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { eventosTorneio } from "../../../../socketio/eventosTorneio";
import { torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

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
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdParamSchema), torneioMutationRateLimiter, autenticarJwt];
  }

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
            totalRodadas: resultado.totalRodadas,
            emCorte: resultado.emCorte,
            rodadaIniciadaEm: resultado.rodadaIniciadaEm,
            partidas: resultado.partidas,
          });

          if (!resultado.emCorte) {
            eventosTorneio.emit("checkin_rodada_aberto", {
              torneioId,
              rodadaAtual: resultado.rodadaAtual,
            });
          }

          if (resultado.emCorte) {
            eventosTorneio.emit("corte_iniciado", {
              torneioId,
              corteTop: resultado.partidas.length * 2,
              rodadaAtual: resultado.rodadaAtual,
              jogadoresClassificados: resultado.partidas.flatMap((p) => [
                { usuarioId: p.jogador1Id, nome: p.jogador1Nome },
                ...(p.jogador2Id ? [{ usuarioId: p.jogador2Id, nome: p.jogador2Nome }] : []),
              ]),
            });
          }
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
