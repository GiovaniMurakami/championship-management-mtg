import { NextFunction, Request, RequestHandler, Response } from "express";
import { GerarLinkIngresso } from "../../../../../casosDeUso/torneio/gerarLinkIngresso";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { torneioIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class GerarLinkIngressoRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly gerarLinkIngressoServico: GerarLinkIngresso
    ) { }

    public static criar(gerarLinkIngressoServico: GerarLinkIngresso) {
        return new GerarLinkIngressoRota(
            "/torneio/:torneioId/gerar-link-ingresso",
            HttpMethod.POST,
            gerarLinkIngressoServico
        );
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] {
        return [validarParamsMiddleware(torneioIdParamSchema), mutationRateLimiter, autenticarJwt];
    }

    public getHandler() {
        return async (
            request: Request,
            response: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                const torneioId = request.params.torneioId as string;
                const requisitanteId = request.usuario!.id;
                const validadeHoras = typeof request.body?.validadeHoras === "number"
                    ? request.body.validadeHoras
                    : undefined;

                const resultado = await this.gerarLinkIngressoServico.executar({
                    torneioId,
                    requisitanteId,
                    isAdmin: request.usuario!.role === "admin",
                    validadeHoras,
                });

                response.status(201).json(resultado);
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
