import { NextFunction, Request, Response } from "express";
import {
  LoginUsuario,
  LoginUsuarioInputDto,
} from "../../../../../casosDeUso/usuario/loginUsuario";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";

export class LoginUsuarioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly loginUsuarioServico: LoginUsuario
  ) {}

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

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { email, senha } = request.body as LoginUsuarioInputDto;

        if (!email || !senha) {
          response.status(400).json({
            mensagem: "E-mail e senha são obrigatórios.",
          });
          return;
        }

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
