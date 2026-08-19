import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  CriarTorneio,
} from "../../../../../casosDeUso/torneio/criarTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { torneioMutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { criarTorneioSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { parseHorarioBrasilia } from "../../../../../helpers/data/brasilia";

export class CriarTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly criarTorneioServico: CriarTorneio
  ) { }

  public static criar(criarTorneioServico: CriarTorneio) {
    return new CriarTorneioRota("/torneio/criar", HttpMethod.POST, criarTorneioServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [torneioMutationRateLimiter, autenticarJwt, autorizarAdmin]; }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const donoId = request.usuario!.id;
        const dados = validarBody(criarTorneioSchema, request.body, response);
        if (!dados) return;

        const {
          nome, horario, formato, descricao, regras,
          bannerUrl, linkBanner, somRodada, storyFundoUrl, storyFundoTextoRodape,
          maxJogadores, maxRodadas, corteTop, linkLive, secreto, exibirNomeJogador,
        } = dados;

        const resultado = await this.criarTorneioServico.executar({
          nome,
          horario: parseHorarioBrasilia(horario),
          formato,
          donoId,
          descricao,
          regras,
          bannerUrl,
          linkBanner,
          somRodada,
          storyFundoUrl,
          storyFundoTextoRodape,
          maxJogadores,
          maxRodadas,
          corteTop,
          linkLive,
          secreto,
          exibirNomeJogador,
        });

        response.status(201).json(resultado);
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
