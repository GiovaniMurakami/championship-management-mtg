import { NextFunction, Request, RequestHandler, Response } from "express";
import { ConfirmarResultado } from "../../../../../casosDeUso/torneio/confirmarResultado";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { resultadoRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { eventosTorneio } from "../../../../socketio/eventosTorneio";

export class ConfirmarResultadoRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly confirmarResultadoServico: ConfirmarResultado
    ) { }

    public static criar(confirmarResultadoServico: ConfirmarResultado) {
        return new ConfirmarResultadoRota(
            "/torneio/partida/:partidaId/confirmar",
            HttpMethod.POST,
            confirmarResultadoServico
        );
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] { return [resultadoRateLimiter, autenticarJwt]; }

    public getHandler() {
        return async (
            request: Request,
            response: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                const usuarioId = request.usuario!.id;
                const partidaId = request.params.partidaId as string;

                const resultado = await this.confirmarResultadoServico.executar({
                    partidaId,
                    usuarioId,
                });

                eventosTorneio.emit("resultado_confirmado", resultado);

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
