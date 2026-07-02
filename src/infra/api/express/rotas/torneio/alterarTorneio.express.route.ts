import { NextFunction, Request, RequestHandler, Response } from "express";
import { AlterarTorneio } from "../../../../../casosDeUso/torneio/alterarTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { alterarTorneioSchema, idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { parseHorarioBrasilia } from "../../../../../helpers/data/brasilia";

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
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(idParamSchema), mutationRateLimiter, autenticarJwt];
  }

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
          nome, horario, formato, descricao, regras,
          bannerUrl, linkBanner, somRodada,
          maxJogadores, maxRodadas, corteTop, linkLive, secreto, exibirNomeJogador,
        } = dados;

        const resultado = await this.alterarTorneioServico.executar({
          id,
          requisitanteId,
          isAdmin: request.usuario!.role === "admin",
          nome,
          horario: horario ? parseHorarioBrasilia(horario) : undefined,
          formato,
          descricao,
          regras,
          bannerUrl,
          linkBanner,
          somRodada,
          maxJogadores,
          maxRodadas,
          corteTop,
          linkLive,
          secreto,
          exibirNomeJogador,
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
