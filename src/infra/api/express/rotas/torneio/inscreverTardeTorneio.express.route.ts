import { NextFunction, Request, RequestHandler, Response } from "express";
import { InscreverTardeTorneio } from "../../../../../casosDeUso/torneio/inscreverTardeTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class InscreverTardeTorneioRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly inscreverTardeTorneioServico: InscreverTardeTorneio
    ) { }

    public static criar(inscreverTardeTorneioServico: InscreverTardeTorneio) {
        return new InscreverTardeTorneioRota(
            "/torneio/:id/inscricao/tardia",
            HttpMethod.POST,
            inscreverTardeTorneioServico
        );
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt]; }

    public getHandler() {
        return async (
            request: Request,
            response: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                const torneioId = request.params.id as string;
                const requisitanteId = request.usuario!.id;
                const { usuarioId } = request.body as { usuarioId: string };

                if (!usuarioId) {
                    response.status(400).json({ mensagem: "usuarioId é obrigatório." });
                    return;
                }

                const resultado = await this.inscreverTardeTorneioServico.executar({
                    torneioId,
                    usuarioId,
                    requisitanteId,
                    isAdmin: request.usuario!.role === "admin",
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
