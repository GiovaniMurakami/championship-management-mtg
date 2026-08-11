import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarUsuarios } from "../../../../../casosDeUso/usuario/listarUsuarios";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { listarUsuariosQuerySchema } from "../../../../../helpers/validacao/schemas";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { z } from "zod";

type ListarUsuariosQuery = z.infer<typeof listarUsuariosQuerySchema>;

export class ListarUsuariosRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarUsuariosServico: ListarUsuarios
  ) { }

  public static criar(listarUsuariosServico: ListarUsuarios) {
    return new ListarUsuariosRota("/usuario/listar", HttpMethod.GET, listarUsuariosServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarQueryMiddleware(listarUsuariosQuerySchema), publicReadRateLimiter, autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { nome, bloqueadoTorneios, limite, offset } = request.queryValidados as ListarUsuariosQuery;
        const resultado = await this.listarUsuariosServico.executar({
          nome,
          bloqueadoTorneios,
          limite,
          offset,
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
