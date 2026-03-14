import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  CriarTorneio,
} from "../../../../../casosDeUso/torneio/criarTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class CriarTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly criarTorneioServico: CriarTorneio
  ) { }

  public static criar(criarTorneioServico: CriarTorneio) {
    return new CriarTorneioRota("/torneio/criar", HttpMethod.POST, criarTorneioServico);
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
        const { nome, horario, formato, premio } = request.body;

        if (!nome || !horario || !formato) {
          response.status(400).json({ mensagem: "nome, horario e formato são obrigatórios." });
          return;
        }

        const resultado = await this.criarTorneioServico.executar({
          nome,
          horario: new Date(horario),
          formato,
          donoId,
          premio,
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
