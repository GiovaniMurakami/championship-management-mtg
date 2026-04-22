import { NextFunction, Request, RequestHandler, Response } from "express";
import { EntrarPorConviteTime } from "../../../../../casosDeUso/time/entrarPorConviteTime";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { mutationRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { z } from "zod";
import { validarBody } from "../../../../../helpers/validacao/validarBody";

const schema = z.object({ conviteToken: z.string().uuid("conviteToken deve ser um UUID válido.") });

export class EntrarPorConviteTimeRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod,
        private readonly entrarPorConviteTimeServico: EntrarPorConviteTime
    ) { }

    public static criar(entrarPorConviteTimeServico: EntrarPorConviteTime) {
        return new EntrarPorConviteTimeRota("/time/entrar-por-convite", HttpMethod.POST, entrarPorConviteTimeServico);
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt]; }

    public getHandler() {
        return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
            try {
                const dados = validarBody(schema, request.body, response);
                if (!dados) return;

                const resultado = await this.entrarPorConviteTimeServico.executar({
                    conviteToken: dados.conviteToken,
                    usuarioId: request.usuario!.id,
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
