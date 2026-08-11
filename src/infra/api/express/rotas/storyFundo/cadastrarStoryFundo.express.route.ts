import { NextFunction, Request, RequestHandler, Response } from "express";
import { CadastrarStoryFundo } from "../../../../../casosDeUso/storyFundo/cadastrarStoryFundo";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { cadastrarStoryFundoSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class CadastrarStoryFundoRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly cadastrarStoryFundoServico: CadastrarStoryFundo
  ) {}

  public static criar(cadastrarStoryFundoServico: CadastrarStoryFundo) {
    return new CadastrarStoryFundoRota("/story-fundo", HttpMethod.POST, cadastrarStoryFundoServico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(cadastrarStoryFundoSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.cadastrarStoryFundoServico.executar({
          nome: dados.nome,
          url: dados.url,
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
