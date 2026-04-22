import { NextFunction, Request, RequestHandler, Response } from "express";
import { RejeitarSolicitacaoTime } from "../../../../../casosDeUso/time/rejeitarSolicitacaoTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class RejeitarSolicitacaoTimeRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly rejeitarSolicitacaoTimeServico: RejeitarSolicitacaoTime
    ) { }

    public static criar(rejeitarSolicitacaoTimeServico: RejeitarSolicitacaoTime) {
        return new RejeitarSolicitacaoTimeRota("/time/:id/rejeitar/:usuarioId", HttpMethod.POST, rejeitarSolicitacaoTimeServico);
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt]; }

    public getHandler() {
        return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
            try {
                const resultado = await this.rejeitarSolicitacaoTimeServico.executar({
                    timeId: request.params.id as string,
                    requisitanteId: request.usuario!.id,
                    usuarioId: request.params.usuarioId as string,
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
