import { NextFunction, Request, RequestHandler, Response } from "express";
import { RegistrarCliqueAnuncio } from "../../../../../casosDeUso/site/registrarCliqueAnuncio";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class RegistrarCliqueAnuncioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly registrarCliqueAnuncioServico: RegistrarCliqueAnuncio
  ) { }

  public static criar(registrarCliqueAnuncioServico: RegistrarCliqueAnuncio) {
    return new RegistrarCliqueAnuncioRota("/site/anuncios/:anuncioId/clique", HttpMethod.POST, registrarCliqueAnuncioServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter]; }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const anuncioId = request.params?.anuncioId;
        const anuncioIdString = Array.isArray(anuncioId) ? anuncioId[0] : anuncioId;
        const resultado = await this.registrarCliqueAnuncioServico.executar({
          anuncioId: anuncioIdString,
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
