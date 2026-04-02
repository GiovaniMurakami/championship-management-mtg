import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  LoginUsuario,
} from "../../../../../casosDeUso/usuario/loginUsuario";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { authRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { loginUsuarioSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class LoginUsuarioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly loginUsuarioServico: LoginUsuario
  ) { }

  public static criar(loginUsuarioServico: LoginUsuario) {
    return new LoginUsuarioRota(
      "/usuario/login",
      HttpMethod.POST,
      loginUsuarioServico
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
        const dados = validarBody(loginUsuarioSchema, request.body, response);
        if (!dados) return;

        const { email, senha } = dados;

        const resultado = await this.loginUsuarioServico.executar({
          email,
          senha,
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
