import { NextFunction, Request, RequestHandler, Response } from "express";
import { RegistrarResultado } from "../../../../../casosDeUso/torneio/registrarResultado";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class RegistrarResultadoRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly registrarResultadoServico: RegistrarResultado
  ) {}

  public static criar(registrarResultadoServico: RegistrarResultado) {
    return new RegistrarResultadoRota(
      "/torneio/partida/:partidaId/resultado",
      HttpMethod.POST,
      registrarResultadoServico
    );
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
        const usuarioId = request.usuario!.id;
        const partidaId = request.params.partidaId as string;
        const { vitoriasJogador1, vitoriasJogador2 } = request.body;

        if (vitoriasJogador1 === undefined || vitoriasJogador2 === undefined) {
          response.status(400).json({ mensagem: "vitoriasJogador1 e vitoriasJogador2 são obrigatórios." });
          return;
        }

        const resultado = await this.registrarResultadoServico.executar({
          partidaId,
          usuarioId,
          vitoriasJogador1: Number(vitoriasJogador1),
          vitoriasJogador2: Number(vitoriasJogador2),
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
