import { NextFunction, Request, RequestHandler, Response } from "express";
import { GerarPresignedUrl } from "../../../../../casosDeUso/upload/gerarPresignedUrl";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class GerarPresignedUrlRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly gerarPresignedUrlServico: GerarPresignedUrl
  ) {}

  public static criar(gerarPresignedUrlServico: GerarPresignedUrl) {
    return new GerarPresignedUrlRota("/upload/presigned-url", HttpMethod.POST, gerarPresignedUrlServico);
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
        const { tipo, contentType, expiracaoSegundos } = request.body;

        if (!tipo || !contentType) {
          response.status(400).json({ mensagem: "Os campos 'tipo' e 'contentType' são obrigatórios." });
          return;
        }

        const resultado = await this.gerarPresignedUrlServico.executar({
          usuarioId,
          tipo,
          contentType,
          expiracaoSegundos,
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
