import { NextFunction, Request, RequestHandler, Response } from "express";
import { AtualizarMesaPartida } from "../../../../../casosDeUso/torneio/atualizarMesaPartida";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { torneioMutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { atualizarMesaPartidaSchema, partidaIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class AtualizarMesaPartidaRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly atualizarMesaPartidaServico: AtualizarMesaPartida
    ) { }

    public static criar(atualizarMesaPartidaServico: AtualizarMesaPartida) {
        return new AtualizarMesaPartidaRota(
            "/torneio/partida/:partidaId/mesa",
            HttpMethod.PATCH,
            atualizarMesaPartidaServico
        );
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] {
        return [validarParamsMiddleware(partidaIdParamSchema), torneioMutationRateLimiter, autenticarJwt];
    }

    public getHandler() {
        return async (
            request: Request,
            response: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                const requisitanteId = request.usuario!.id;
                const partidaId = request.params.partidaId as string;
                const dados = validarBody(atualizarMesaPartidaSchema, request.body, response);
                if (!dados) return;

                const resultado = await this.atualizarMesaPartidaServico.executar({
                    partidaId,
                    mesa: dados.mesa ?? null,
                    requisitanteId,
                    isAdmin: request.usuario!.role === "admin",
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
