import { NextFunction, Request, RequestHandler, Response } from "express";
import { MeuHistoricoTorneio } from "../../../../../casosDeUso/torneio/meuHistoricoTorneio";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";

export class MeuHistoricoTorneioRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly meuHistoricoServico: MeuHistoricoTorneio
    ) { }

    public static criar(meuHistoricoServico: MeuHistoricoTorneio) {
        return new MeuHistoricoTorneioRota(
            "/torneio/:torneioId/meu-historico",
            HttpMethod.GET,
            meuHistoricoServico
        );
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] { return [autenticarJwt]; }

    public getHandler() {
        return async (
            request: Request,
            response: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                const torneioId = request.params.torneioId as string;
                const usuarioId = request.usuario!.id;

                const resultado = await this.meuHistoricoServico.executar({
                    torneioId,
                    usuarioId,
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
