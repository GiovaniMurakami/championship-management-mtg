import { NextFunction, Request, RequestHandler, Response } from "express";
import { SolicitarEntradaTime } from "../../../../../casosDeUso/time/solicitarEntradaTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class SolicitarEntradaTimeRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly solicitarEntradaTimeServico: SolicitarEntradaTime
    ) { }

    public static criar(solicitarEntradaTimeServico: SolicitarEntradaTime) {
        return new SolicitarEntradaTimeRota("/time/:id/solicitar", HttpMethod.POST, solicitarEntradaTimeServico);
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt]; }

    public getHandler() {
        return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
            try {
                const resultado = await this.solicitarEntradaTimeServico.executar({
                    timeId: request.params.id as string,
                    usuarioId: request.usuario!.id,
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
