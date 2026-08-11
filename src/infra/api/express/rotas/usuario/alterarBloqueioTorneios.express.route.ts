import { NextFunction, Request, RequestHandler, Response } from "express";
import { AlterarBloqueioTorneios } from "../../../../../casosDeUso/usuario/alterarBloqueioTorneios";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import {
  alterarBloqueioTorneiosSchema,
  usuarioIdParamSchema,
} from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class AlterarBloqueioTorneiosRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly alterarBloqueioTorneiosServico: AlterarBloqueioTorneios,
  ) {}

  public static criar(alterarBloqueioTorneiosServico: AlterarBloqueioTorneios) {
    return new AlterarBloqueioTorneiosRota(
      "/usuario/:usuarioId/bloqueio-torneios",
      HttpMethod.PUT,
      alterarBloqueioTorneiosServico,
    );
  }

  public getCaminho(): string {
    return this.caminho;
  }

  public getMetodo(): HttpMethod {
    return this.metodo;
  }

  public getMiddlewares(): RequestHandler[] {
    return [
      validarParamsMiddleware(usuarioIdParamSchema),
      mutationRateLimiter,
      autenticarJwt,
      autorizarAdmin,
    ];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      try {
        const usuarioId = request.params.usuarioId as string;
        const dados = validarBody(alterarBloqueioTorneiosSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.alterarBloqueioTorneiosServico.executar({
          usuarioId,
          bloqueado: dados.bloqueado,
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
