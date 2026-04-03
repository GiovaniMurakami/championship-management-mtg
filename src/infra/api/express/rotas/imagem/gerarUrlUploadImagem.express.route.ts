import { NextFunction, Request, RequestHandler, Response } from "express";
import { GerarUrlUploadImagem } from "../../../../../casosDeUso/imagem/gerarUrlUploadImagem";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { uploadImagemRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { gerarUrlUploadImagemSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class GerarUrlUploadImagemRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly gerarUrlUploadImagemServico: GerarUrlUploadImagem
    ) { }

    public static criar(gerarUrlUploadImagemServico: GerarUrlUploadImagem) {
        return new GerarUrlUploadImagemRota(
            "/imagem/upload-url",
            HttpMethod.POST,
            gerarUrlUploadImagemServico
        );
    }

    public getCaminho(): string {
        return this.caminho;
    }

    public getMetodo(): HttpMethod {
        return this.metodo;
    }

    public getMiddlewares(): RequestHandler[] {
        return [uploadImagemRateLimiter, autenticarJwt];
    }

    public getHandler() {
        return async (
            request: Request,
            response: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                const usuarioId = request.usuario!.id;
                const dados = validarBody(gerarUrlUploadImagemSchema, request.body, response);
                if (!dados) return;

                const resultado = await this.gerarUrlUploadImagemServico.executar({
                    contentType: dados.contentType,
                    tamanhoBytes: dados.tamanhoBytes,
                    usuarioId,
                });

                response.status(200).json(resultado);
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
