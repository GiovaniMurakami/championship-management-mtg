import { NextFunction, Request, RequestHandler, Response } from "express";
import { ExportarMtggoldfish } from "../../../../../casosDeUso/torneio/exportarMtggoldfish";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { torneioReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { torneioIdOuSlugParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { HttpMethod, Rotas } from "../rotas";

export class ExportarMtggoldfishRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly exportarMtggoldfishServico: ExportarMtggoldfish
  ) {}

  public static criar(exportarMtggoldfishServico: ExportarMtggoldfish) {
    return new ExportarMtggoldfishRota(
      "/torneio/:torneioId/export/mtggoldfish",
      HttpMethod.GET,
      exportarMtggoldfishServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdOuSlugParamSchema), torneioReadRateLimiter];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const torneioId = request.params.torneioId as string;
        const resultado = await this.exportarMtggoldfishServico.executar({ torneioId });
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
