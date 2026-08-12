import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarPartidasTorneio } from "../../../../../casosDeUso/torneio/listarPartidasTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { listarPartidasQuerySchema, torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";

export class ListarPartidasTorneioRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly listarPartidasTorneioServico: ListarPartidasTorneio
    ) { }

    public static criar(listarPartidasTorneioServico: ListarPartidasTorneio) {
        return new ListarPartidasTorneioRota(
            "/torneio/:torneioId/partidas",
            HttpMethod.GET,
            listarPartidasTorneioServico
        );
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] {
        return [
            validarParamsMiddleware(torneioIdParamSchema),
            validarQueryMiddleware(listarPartidasQuerySchema),
            publicReadRateLimiter,
        ];
    }

    public getHandler() {
        return async (
            request: Request,
            response: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                const torneioId = request.params.torneioId as string;
                const { rodada } = request.queryValidados as { rodada?: number };

                const resultado = await this.listarPartidasTorneioServico.executar({
                    torneioId,
                    rodada,
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
