import { NextFunction, Request, RequestHandler, Response } from "express";
import { IngressarViaTorneio } from "../../../../../casosDeUso/torneio/ingressarViaTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { ingressarViaTorneioSchema, tokenIngressoParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";

export class IngressarViaTorneioRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly ingressarViaTorneioServico: IngressarViaTorneio
    ) { }

    public static criar(ingressarViaTorneioServico: IngressarViaTorneio) {
        return new IngressarViaTorneioRota(
            "/torneio/ingressar/:token",
            HttpMethod.POST,
            ingressarViaTorneioServico
        );
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] {
        return [validarParamsMiddleware(tokenIngressoParamSchema), mutationRateLimiter, autenticarJwt];
    }

    public getHandler() {
        return async (
            request: Request,
            response: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                const token = request.params.token as string;
                const usuarioId = request.usuario!.id;
                const dados = validarBody(ingressarViaTorneioSchema, request.body, response);
                if (!dados) return;

                const resultado = await this.ingressarViaTorneioServico.executar({
                    token,
                    usuarioId,
                    deckId: dados.deckId,
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
