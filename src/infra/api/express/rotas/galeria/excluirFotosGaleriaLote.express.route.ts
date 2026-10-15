import { NextFunction, Request, RequestHandler, Response } from "express";
import { ExcluirFotosGaleriaLote } from "../../../../../casosDeUso/galeria/excluirFotosGaleriaLote";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { excluirFotosGaleriaLoteSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class ExcluirFotosGaleriaLoteRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly excluirFotosGaleriaLoteServico: ExcluirFotosGaleriaLote
  ) {}

  public static criar(excluirFotosGaleriaLoteServico: ExcluirFotosGaleriaLote) {
    return new ExcluirFotosGaleriaLoteRota("/galeria/excluir-lote", HttpMethod.POST, excluirFotosGaleriaLoteServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(excluirFotosGaleriaLoteSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.excluirFotosGaleriaLoteServico.executar({ ids: dados.ids });
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
