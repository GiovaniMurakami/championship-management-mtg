import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  CadastrarDeck,
  CadastrarDeckInputDto,
} from "../../../../../casosDeUso/deck/cadastrarDeck";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class CadastrarDeckRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly cadastrarDeckServico: CadastrarDeck
  ) {}

  public static criar(cadastrarDeckServico: CadastrarDeck) {
    return new CadastrarDeckRota(
      "/deck/cadastrar",
      HttpMethod.POST,
      cadastrarDeckServico
    );
  }

  public getCaminho(): string {
    return this.caminho;
  }

  public getMetodo(): HttpMethod {
    return this.metodo;
  }

  public getMiddlewares(): RequestHandler[] {
    return [autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const usuarioId = request.usuario!.id;
        const { nome, formato, maindeck, sideboard } =
          request.body as Omit<CadastrarDeckInputDto, "usuarioId">;

        if (!nome || !formato || !maindeck) {
          response.status(400).json({
            mensagem: "nome, formato e maindeck são obrigatórios.",
          });
          return;
        }

        if (!Array.isArray(maindeck) || maindeck.length === 0) {
          response.status(400).json({
            mensagem: "maindeck deve ser um array com ao menos uma carta.",
          });
          return;
        }

        const resultado = await this.cadastrarDeckServico.executar({
          nome,
          formato,
          maindeck,
          sideboard: Array.isArray(sideboard) ? sideboard : [],
          usuarioId,
        });

        response.status(201).json(resultado);
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          response.status(error.status).json({
            mensagem: error.message,
            erros: error.erros,
          });
          return;
        }
        next(error);
      }
    };
  }
}
