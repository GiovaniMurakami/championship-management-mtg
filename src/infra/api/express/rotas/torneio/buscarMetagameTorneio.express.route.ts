import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarMetagameTorneio } from "../../../../../casosDeUso/metagame/buscarMetagameTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { torneioReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class BuscarMetagameTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: BuscarMetagameTorneio
  ) {}

  public static criar(servico: BuscarMetagameTorneio) {
    return new BuscarMetagameTorneioRota(
      "/torneio/:torneioId/metagame",
      HttpMethod.GET,
      servico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdParamSchema), torneioReadRateLimiter];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const torneioId = request.params.torneioId as string;
        const resultado = await this.servico.executar({ torneioId });
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
