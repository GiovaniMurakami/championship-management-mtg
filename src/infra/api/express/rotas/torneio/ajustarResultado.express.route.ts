import { NextFunction, Request, RequestHandler, Response } from "express";
import { AjustarResultado } from "../../../../../casosDeUso/torneio/ajustarResultado";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { registrarResultadoSchema, partidaIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { eventosTorneio } from "../../../../socketio/eventosTorneio";

export class AjustarResultadoRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly ajustarResultadoServico: AjustarResultado
    ) { }

    public static criar(ajustarResultadoServico: AjustarResultado) {
        return new AjustarResultadoRota(
            "/torneio/partida/:partidaId/ajustar",
            HttpMethod.PUT,
            ajustarResultadoServico
        );
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] {
        return [validarParamsMiddleware(partidaIdParamSchema), mutationRateLimiter, autenticarJwt];
    }

    public getHandler() {
        return async (
            request: Request,
            response: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                const partidaId = request.params.partidaId as string;
                const requisitanteId = request.usuario!.id;
                const dados = validarBody(registrarResultadoSchema, request.body, response);
                if (!dados) return;

                const resultado = await this.ajustarResultadoServico.executar({
                    partidaId,
                    requisitanteId,
                    isAdmin: request.usuario!.role === "admin",
                    vitoriasJogador1: dados.vitoriasJogador1,
                    vitoriasJogador2: dados.vitoriasJogador2,
                });

                eventosTorneio.emit("resultado_ajustado", {
                    torneioId: resultado.torneioId,
                    partidaId: resultado.id,
                    rodada: resultado.rodada,
                    vitoriasJogador1: resultado.vitoriasJogador1,
                    vitoriasJogador2: resultado.vitoriasJogador2,
                    contestado: resultado.contestado,
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
