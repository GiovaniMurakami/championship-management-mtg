import { NextFunction, Request, RequestHandler, Response } from "express";
import { AdicionarMembro } from "../../../../../casosDeUso/time/adicionarMembro";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class AdicionarMembroRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly adicionarMembroServico: AdicionarMembro
  ) {}

  public static criar(adicionarMembroServico: AdicionarMembro) {
    return new AdicionarMembroRota("/time/:id/membro", HttpMethod.POST, adicionarMembroServico);
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
        const requisitanteId = request.usuario!.id;
        const isAdmin = request.usuario!.role === "admin";
        const { novoMembroId } = request.body;

        if (!novoMembroId) {
          response.status(400).json({ mensagem: "O campo 'novoMembroId' é obrigatório." });
          return;
        }

        const resultado = await this.adicionarMembroServico.executar({
          timeId,
          requisitanteId,
          isAdmin,
          novoMembroId,
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
