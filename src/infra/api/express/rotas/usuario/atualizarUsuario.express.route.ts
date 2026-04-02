import { NextFunction, Request, Response } from "express";
import {
  AtualizarUsuario,
} from "../../../../../casosDeUso/usuario/atualizarUsuario";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { accountRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { atualizarUsuarioSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class AtualizarUsuarioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly atualizarUsuarioServico: AtualizarUsuario
  ) { }

  public static criar(atualizarUsuarioServico: AtualizarUsuario) {
    return new AtualizarUsuarioRota(
      "/usuario/atualizar",
      HttpMethod.PUT,
      atualizarUsuarioServico
    );
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
      next: NextFunction
    ): Promise<void> => {
      try {
        const usuarioId = request.usuario?.id;

        if (!usuarioId) {
          response.status(401).json({
            mensagem: "Usuário não autenticado.",
          });
          return;
        }

        const dados = validarBody(atualizarUsuarioSchema, request.body, response);
        if (!dados) return;

        const { nome, telefone, nickMTGO, nickArena } = dados;

        const resultado = await this.atualizarUsuarioServico.executar({
          id: usuarioId,
          nome,
          telefone,
          nickMTGO,
          nickArena,
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
