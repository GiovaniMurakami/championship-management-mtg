import { NextFunction, Request, RequestHandler, Response } from "express";
import { IniciarTorneio } from "../../../../../casosDeUso/torneio/iniciarTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { eventosTorneio } from "../../../../socketio/eventosTorneio";

export class IniciarTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly iniciarTorneioServico: IniciarTorneio
  ) {}

  public static criar(iniciarTorneioServico: IniciarTorneio) {
    return new IniciarTorneioRota(
      "/torneio/:torneioId/iniciar",
      HttpMethod.POST,
      iniciarTorneioServico
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
        const donoId = request.usuario!.id;
        const torneioId = request.params.torneioId as string;

        const resultado = await this.iniciarTorneioServico.executar({
          torneioId,
          donoId,
        });

        eventosTorneio.emit("rodada_iniciada", {
          torneioId: resultado.torneioId,
          rodadaAtual: resultado.rodadaAtual,
          totalRodadas: resultado.totalRodadas,
          partidas: resultado.partidas,
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
