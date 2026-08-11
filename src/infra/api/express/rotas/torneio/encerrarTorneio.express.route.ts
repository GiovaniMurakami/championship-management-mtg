import { NextFunction, Request, RequestHandler, Response } from "express";
import { EncerrarTorneio } from "../../../../../casosDeUso/torneio/encerrarTorneio";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { eventosTorneio } from "../../../../socketio/eventosTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class EncerrarTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: EncerrarTorneio,
  ) {}

  public static criar(servico: EncerrarTorneio) {
    return new EncerrarTorneioRota(
      "/torneio/:torneioId/encerrar",
      HttpMethod.POST,
      servico,
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarParamsMiddleware(torneioIdParamSchema), mutationRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const torneioId = request.params.torneioId as string;
        const resultado = await this.servico.executar({
          torneioId,
          usuarioId: request.usuario!.id,
          isAdmin: request.usuario!.role === "admin",
        });

        eventosTorneio.emit("torneio_finalizado", resultado);
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
