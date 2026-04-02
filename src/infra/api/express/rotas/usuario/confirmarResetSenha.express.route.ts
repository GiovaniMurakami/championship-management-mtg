import { NextFunction, Request, Response } from "express";
import { ConfirmarResetSenha } from "../../../../../casosDeUso/usuario/confirmarResetSenha";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";

export class ConfirmarResetSenhaRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly confirmarResetSenhaServico: ConfirmarResetSenha
    ) { }

    public static criar(confirmarResetSenhaServico: ConfirmarResetSenha) {
        return new ConfirmarResetSenhaRota(
            "/usuario/reset-senha/confirmar",
            HttpMethod.POST,
            confirmarResetSenhaServico
        );
    }

    public getCaminho(): string {
        return this.caminho;
    }

    public getMetodo(): HttpMethod {
        return this.metodo;
    }

    public getHandler() {
        return async (
            request: Request,
            response: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                const { token, novaSenha } = request.body;

                const resultado = await this.confirmarResetSenhaServico.executar({
                    token,
                    novaSenha,
                });

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
