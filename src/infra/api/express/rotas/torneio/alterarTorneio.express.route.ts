import { NextFunction, Request, RequestHandler, Response } from "express";
import { AlterarTorneio } from "../../../../../casosDeUso/torneio/alterarTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class AlterarTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly alterarTorneioServico: AlterarTorneio
  ) {}

  public static criar(alterarTorneioServico: AlterarTorneio) {
    return new AlterarTorneioRota("/torneio/:id", HttpMethod.PUT, alterarTorneioServico);
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
        const id = request.params.id;
        const requisitanteId = request.usuario!.id;
        const {
          nome, horario, formato, premio,
          bannerUrl, linkBanner, somRodada,
          maxJogadores, maxRodadas, corteTop, linkLive,
        } = request.body;

        const resultado = await this.alterarTorneioServico.executar({
          id,
          requisitanteId,
          isAdmin: request.usuario!.role === "admin",
          nome,
          horario: horario ? new Date(horario) : undefined,
          formato,
          premio,
          bannerUrl,
          linkBanner,
          somRodada,
          maxJogadores,
          maxRodadas,
          corteTop,
          linkLive,
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
