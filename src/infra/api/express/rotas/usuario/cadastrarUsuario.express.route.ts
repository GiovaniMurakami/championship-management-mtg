import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  CadastrarUsuario,
  CadastrarUsuarioInputDto,
} from "../../../../../casosDeUso/usuario/cadastrarUsuario";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { authRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class CadastrarUsuarioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly cadastrarUsuarioServico: CadastrarUsuario
  ) {}

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
        const { nome, email, senha } =
          request.body as CadastrarUsuarioInputDto;

        if (!nome || !email || !senha) {
          response.status(400).json({
            mensagem: "Nome, e-mail e senha são obrigatórios.",
          });
          return;
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!emailValido) {
          response.status(400).json({ mensagem: "E-mail inválido." });
          return;
        }

        if (senha.length < 8) {
          response.status(400).json({ mensagem: "A senha deve ter no mínimo 8 caracteres." });
          return;
        }

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
