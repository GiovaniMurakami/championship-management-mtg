import { NextFunction, Request, RequestHandler, Response } from "express";
import { CadastrarFotoGaleria } from "../../../../../casosDeUso/galeria/cadastrarFotoGaleria";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { cadastrarFotoGaleriaSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class CadastrarFotoGaleriaRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly cadastrarFotoGaleriaServico: CadastrarFotoGaleria
  ) {}

  public static criar(cadastrarFotoGaleriaServico: CadastrarFotoGaleria) {
    return new CadastrarFotoGaleriaRota("/galeria", HttpMethod.POST, cadastrarFotoGaleriaServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(cadastrarFotoGaleriaSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.cadastrarFotoGaleriaServico.executar({
          url: dados.url,
          titulo: dados.titulo,
          usuarioId: request.usuario!.id,
        });
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
