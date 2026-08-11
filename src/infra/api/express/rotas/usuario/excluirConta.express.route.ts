import { NextFunction, Request, Response } from "express";
import { ExcluirConta } from "../../../../../casosDeUso/usuario/excluirConta";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { accountRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { excluirContaSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class ExcluirContaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly excluirContaServico: ExcluirConta,
  ) {}

  public static criar(excluirContaServico: ExcluirConta) {
    return new ExcluirContaRota("/usuario/conta", HttpMethod.DELETE, excluirContaServico);
  }

  public getCaminho(): string {
    return this.caminho;
  }

  public getMetodo(): HttpMethod {
    return this.metodo;
  }

  public getMiddlewares() {
    return [accountRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      try {
        const usuarioId = request.usuario?.id;
        if (!usuarioId) {
          response.status(401).json({ mensagem: "Usuário não autenticado." });
          return;
        }

        const dados = validarBody(excluirContaSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.excluirContaServico.executar({
          usuarioId,
          confirmacao: dados.confirmacao,
        });

        response.status(200).json(resultado);
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          response.status(error.status).json({
            mensagem: error.message,
            erros: error.erros,
          });
          return;
        }
        next(error);
      }
    };
  }
}
