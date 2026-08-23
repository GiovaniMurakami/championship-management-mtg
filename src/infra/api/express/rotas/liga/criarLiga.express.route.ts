import { NextFunction, Request, RequestHandler, Response } from "express";
import { CriarLiga } from "../../../../../casosDeUso/liga/criarLiga";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { criarLigaSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class CriarLigaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly criarLigaServico: CriarLiga
  ) { }

  public static criar(criarLigaServico: CriarLiga) {
    return new CriarLigaRota("/liga/criar", HttpMethod.POST, criarLigaServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt, autorizarAdmin]; }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const donoId = request.usuario!.id;
        const dados = validarBody(criarLigaSchema, request.body, response);
        if (!dados) return;

        const { nome, descricao, bannerUrl, torneioIds, tipo } = dados;

        const resultado = await this.criarLigaServico.executar({
          nome,
          descricao,
          bannerUrl,
          donoId,
          torneioIds,
          tipo,
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
