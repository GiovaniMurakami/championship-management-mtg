import { NextFunction, Request, RequestHandler, Response } from "express";
import { AprovarSolicitacaoTime } from "../../../../../casosDeUso/time/aprovarSolicitacaoTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { timeIdUsuarioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class AprovarSolicitacaoTimeRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly aprovarSolicitacaoTimeServico: AprovarSolicitacaoTime
    ) { }

    public static criar(aprovarSolicitacaoTimeServico: AprovarSolicitacaoTime) {
        return new AprovarSolicitacaoTimeRota("/time/:id/aprovar/:usuarioId", HttpMethod.POST, aprovarSolicitacaoTimeServico);
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] { return [validarParamsMiddleware(timeIdUsuarioIdParamSchema), mutationRateLimiter, autenticarJwt]; }

    public getHandler() {
        return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
            try {
                const resultado = await this.aprovarSolicitacaoTimeServico.executar({
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
