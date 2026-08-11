import { NextFunction, Request, RequestHandler, Response } from "express";
import { ContestarResultado } from "../../../../../casosDeUso/torneio/contestarResultado";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { resultadoRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { partidaIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { eventosTorneio } from "../../../../socketio/eventosTorneio";
import { contestarResultadoSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

export class ContestarResultadoRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly contestarResultadoServico: ContestarResultado
    ) { }

    public static criar(contestarResultadoServico: ContestarResultado) {
        return new ContestarResultadoRota(
            "/torneio/partida/:partidaId/contestar",
            HttpMethod.POST,
            contestarResultadoServico
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
                const body = validarBody(contestarResultadoSchema, request.body ?? {}, response);
                if (!body) return;

                const resultado = await this.contestarResultadoServico.executar({
                    partidaId,
                    usuarioId,
                    isAdmin: request.usuario!.role === "admin",
                    observacao: body.observacao,
                });

                eventosTorneio.emit("resultado_contestado", resultado);

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
