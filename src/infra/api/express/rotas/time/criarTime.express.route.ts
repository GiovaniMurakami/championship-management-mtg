import { NextFunction, Request, RequestHandler, Response } from "express";
import { CriarTime } from "../../../../../casosDeUso/time/criarTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class CriarTimeRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly criarTimeServico: CriarTime
  ) {}

  public static criar(criarTimeServico: CriarTime) {
    return new CriarTimeRota("/time/criar", HttpMethod.POST, criarTimeServico);
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
        const donoId = request.usuario!.id;
        const { nome, tag, fotoUrl } = request.body;

        if (!nome || !tag) {
          response.status(400).json({ mensagem: "Os campos 'nome' e 'tag' são obrigatórios." });
          return;
        }

        const resultado = await this.criarTimeServico.executar({ nome, tag, donoId, fotoUrl });
        response.status(201).json(resultado);
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
