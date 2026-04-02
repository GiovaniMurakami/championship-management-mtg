import { NextFunction, Request, Response } from "express";
import { SolicitarResetSenha } from "../../../../../casosDeUso/usuario/solicitarResetSenha";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { authRateLimiter } from "../../../../../middlewares/express/rateLimiter";

export class SolicitarResetSenhaRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly solicitarResetSenhaServico: SolicitarResetSenha
    ) { }

    public static criar(solicitarResetSenhaServico: SolicitarResetSenha) {
        return new SolicitarResetSenhaRota(
            "/usuario/reset-senha/solicitar",
            HttpMethod.POST,
            solicitarResetSenhaServico
        );
    }

    public getCaminho(): string {
        return this.caminho;
    }

    public getMetodo(): HttpMethod {
        return this.metodo;
    }

    public getMiddlewares() {
        return [authRateLimiter];
    }

    public getHandler() {
        return async (
            request: Request,
            response: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                const { email } = request.body;

                const resultado = await this.solicitarResetSenhaServico.executar({ email });

                response.status(200).json(resultado);
            } catch (error) {
                if (error instanceof ErroPersonalizado) {
                    response.status(error.status).json({
                        mensagem: error.message,
                        erros: error.erros,
                    });
                    return;
                }
                next(error);
            }
        };
    }
}
