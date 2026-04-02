import { NextFunction, Request, RequestHandler, Response } from "express";
import { AlterarTorneio } from "../../../../../casosDeUso/torneio/alterarTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { alterarTorneioSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class AlterarTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly alterarTorneioServico: AlterarTorneio
  ) { }

  public static criar(alterarTorneioServico: AlterarTorneio) {
    return new AlterarTorneioRota("/torneio/:id", HttpMethod.PUT, alterarTorneioServico);
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
        const id = request.params.id as string;
        const requisitanteId = request.usuario!.id;
        const dados = validarBody(alterarTorneioSchema, request.body, response);
        if (!dados) return;

        const {
          nome, horario, formato, premio,
          bannerUrl, linkBanner, somRodada,
          maxJogadores, maxRodadas, corteTop, linkLive,
        } = dados;

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
