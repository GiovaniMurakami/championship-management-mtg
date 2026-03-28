import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarTorneios } from "../../../../../casosDeUso/torneio/listarTorneios";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class ListarTorneiosRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarTorneiosServico: ListarTorneios
  ) {}

  public static criar(listarTorneiosServico: ListarTorneios) {
    return new ListarTorneiosRota(
      "/torneio/listar",
      HttpMethod.GET,
      listarTorneiosServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [autenticarJwt]; }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const resultado = await this.listarTorneiosServico.executar({
          usuarioId: request.usuario!.id,
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
