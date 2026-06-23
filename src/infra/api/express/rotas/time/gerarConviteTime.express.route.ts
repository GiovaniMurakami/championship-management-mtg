import { NextFunction, Request, RequestHandler, Response } from "express";
import { GerarConviteTime } from "../../../../../casosDeUso/time/gerarConviteTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { idParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class GerarConviteTimeRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly gerarConviteTimeServico: GerarConviteTime
    ) { }

    public static criar(gerarConviteTimeServico: GerarConviteTime) {
        return new GerarConviteTimeRota("/time/:id/gerar-convite", HttpMethod.POST, gerarConviteTimeServico);
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] { return [validarParamsMiddleware(idParamSchema), mutationRateLimiter, autenticarJwt]; }

    public getHandler() {
        return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
            try {
                const resultado = await this.gerarConviteTimeServico.executar({
                    timeId: request.params.id as string,
                    requisitanteId: request.usuario!.id,
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
