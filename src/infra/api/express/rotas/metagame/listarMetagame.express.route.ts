import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarMetagame } from "../../../../../casosDeUso/metagame/listarMetagame";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { heavyReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { listarMetagameQuerySchema } from "../../../../../helpers/validacao/schemas";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { z } from "zod";

type Query = z.infer<typeof listarMetagameQuerySchema>;

export class ListarMetagameRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: ListarMetagame
  ) {}

  public static criar(servico: ListarMetagame) {
    return new ListarMetagameRota("/metagame", HttpMethod.GET, servico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [heavyReadRateLimiter, validarQueryMiddleware(listarMetagameQuerySchema)];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const { formato, dias } = request.queryValidados as Query;
        const resultado = await this.servico.executar({ formato, dias });
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
