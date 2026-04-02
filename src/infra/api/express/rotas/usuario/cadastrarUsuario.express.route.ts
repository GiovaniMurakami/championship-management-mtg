import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  CadastrarUsuario,
} from "../../../../../casosDeUso/usuario/cadastrarUsuario";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { authRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { cadastrarUsuarioSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class CadastrarUsuarioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly cadastrarUsuarioServico: CadastrarUsuario
  ) { }

  public static criar(cadastrarUsuarioServico: CadastrarUsuario) {
    return new CadastrarUsuarioRota(
      "/usuario/cadastrar",
      HttpMethod.POST,
      cadastrarUsuarioServico
    );
  }

  public getCaminho(): string {
    return this.caminho;
  }

  public getMetodo(): HttpMethod {
    return this.metodo;
  }

  public getMiddlewares(): RequestHandler[] {
    return [authRateLimiter];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const dados = validarBody(cadastrarUsuarioSchema, request.body, response);
        if (!dados) return;

        const { nome, email, senha } = dados;

        const resultado = await this.cadastrarUsuarioServico.executar({
          nome,
          email,
          senha,
        });

        response.status(201).json(resultado);
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
