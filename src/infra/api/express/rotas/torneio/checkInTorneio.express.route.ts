import { NextFunction, Request, RequestHandler, Response } from "express";
import { CheckInTorneio } from "../../../../../casosDeUso/torneio/checkInTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class CheckInTorneioRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly checkInTorneioServico: CheckInTorneio
  ) {}

  public static criar(checkInTorneioServico: CheckInTorneio) {
    return new CheckInTorneioRota(
      "/torneio/:torneioId/checkin",
      HttpMethod.POST,
      checkInTorneioServico
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
        const torneioId = request.params.torneioId as string;

        const resultado = await this.checkInTorneioServico.executar({
          torneioId,
          usuarioId,
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
