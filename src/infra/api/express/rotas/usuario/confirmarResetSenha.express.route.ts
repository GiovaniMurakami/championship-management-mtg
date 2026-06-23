import { NextFunction, Request, Response } from "express";
import { ConfirmarResetSenha } from "../../../../../casosDeUso/usuario/confirmarResetSenha";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { authRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { confirmarResetSenhaSchema } from "../../../../../helpers/validacao/schemas";

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
                const body = validarBody(confirmarResetSenhaSchema, request.body, response);
                if (!body) return;

                const resultado = await this.confirmarResetSenhaServico.executar({
                    token: body.token,
                    novaSenha: body.novaSenha,
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
