import { NextFunction, Request, RequestHandler, Response } from "express";
import { LogoutUsuario } from "../../../../../casosDeUso/usuario/logoutUsuario";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class LogoutUsuarioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly logoutServico: LogoutUsuario
  ) {}

  public static criar(logoutServico: LogoutUsuario) {
    return new LogoutUsuarioRota("/usuario/logout", HttpMethod.POST, logoutServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [autenticarJwt]; }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = request.headers["authorization"];
        const token = authHeader?.replace("Bearer ", "") ?? "";
        const resultado = await this.logoutServico.executar({ token });
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
