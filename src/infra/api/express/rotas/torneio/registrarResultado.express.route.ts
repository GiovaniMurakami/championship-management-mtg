import { NextFunction, Request, RequestHandler, Response } from "express";
import { RegistrarResultado } from "../../../../../casosDeUso/torneio/registrarResultado";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { resultadoRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { eventosTorneio } from "../../../../socketio/eventosTorneio";
import { registrarResultadoSchema, partidaIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class RegistrarResultadoRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly registrarResultadoServico: RegistrarResultado
  ) { }

  public static criar(registrarResultadoServico: RegistrarResultado) {
    return new RegistrarResultadoRota(
      "/torneio/partida/:partidaId/resultado",
      HttpMethod.POST,
      registrarResultadoServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(partidaIdParamSchema), resultadoRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const usuarioId = request.usuario!.id;
        const partidaId = request.params.partidaId as string;
        const dados = validarBody(registrarResultadoSchema, request.body, response);
        if (!dados) return;

        const resultado = await this.registrarResultadoServico.executar({
          partidaId,
          usuarioId,
          isAdmin: request.usuario!.role === "admin",
          vitoriasJogador1: dados.vitoriasJogador1,
          vitoriasJogador2: dados.vitoriasJogador2,
        });

        // Standings só são materializados ao encerrar a rodada (proxima-rodada).
        // Não recalcular Swiss a cada resultado.
        eventosTorneio.emit("resultado_registrado", resultado);

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
