import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarArquetipoMetagame } from "../../../../../casosDeUso/metagame/buscarArquetipoMetagame";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { heavyReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import {
  metagameArquetipoParamsSchema,
  metagameDiasQuerySchema,
} from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { z } from "zod";

type Params = z.infer<typeof metagameArquetipoParamsSchema>;
type Query = z.infer<typeof metagameDiasQuerySchema>;

export class BuscarArquetipoMetagameRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: BuscarArquetipoMetagame
  ) {}

  public static criar(servico: BuscarArquetipoMetagame) {
    return new BuscarArquetipoMetagameRota("/metagame/:formato/:slug", HttpMethod.GET, servico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [
      heavyReadRateLimiter,
      validarParamsMiddleware(metagameArquetipoParamsSchema),
      validarQueryMiddleware(metagameDiasQuerySchema),
    ];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const { formato, slug } = request.paramsValidados as Params;
        const { dias, limiteListas } = request.queryValidados as Query;
        const resultado = await this.servico.executar({ formato, slug, dias, limiteListas });
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
