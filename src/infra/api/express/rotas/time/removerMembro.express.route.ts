import { NextFunction, Request, RequestHandler, Response } from "express";
import { RemoverMembro } from "../../../../../casosDeUso/time/removerMembro";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class RemoverMembroRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly removerMembroServico: RemoverMembro
  ) {}

  public static criar(removerMembroServico: RemoverMembro) {
    return new RemoverMembroRota("/time/:id/membro/:membroId", HttpMethod.DELETE, removerMembroServico);
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
        const timeId = request.params.id as string;
        const membroId = request.params.membroId as string;
        const requisitanteId = request.usuario!.id;
        const isAdmin = request.usuario!.role === "admin";

        const resultado = await this.removerMembroServico.executar({
          timeId,
          requisitanteId,
          isAdmin,
          membroId,
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
