import { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { SalvarCartaRepresentativaArquetipo } from "../../../../../casosDeUso/metagame/salvarCartaRepresentativaArquetipo";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import {
  metagameArquetipoParamsSchema,
  salvarCartaRepresentativaArquetipoSchema,
} from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

type Params = z.infer<typeof metagameArquetipoParamsSchema>;

export class SalvarCartaRepresentativaArquetipoRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: SalvarCartaRepresentativaArquetipo
  ) {}

  public static criar(servico: SalvarCartaRepresentativaArquetipo) {
    return new SalvarCartaRepresentativaArquetipoRota(
      "/metagame/:formato/:slug/carta-representativa",
      HttpMethod.PUT,
      servico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [
      mutationRateLimiter,
      autenticarJwt,
      autorizarAdmin,
      validarParamsMiddleware(metagameArquetipoParamsSchema),
    ];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const { formato, slug } = request.paramsValidados as Params;
        const dados = validarBody(salvarCartaRepresentativaArquetipoSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.servico.executar({
          formato,
          slug,
          cartaRepresentativa: dados.cartaRepresentativa,
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
