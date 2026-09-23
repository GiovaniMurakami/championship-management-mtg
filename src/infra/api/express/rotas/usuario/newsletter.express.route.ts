import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarAssinantesNewsletter } from "../../../../../casosDeUso/usuario/listarAssinantesNewsletter";
import { DescadastrarNewsletter } from "../../../../../casosDeUso/usuario/descadastrarNewsletter";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter, publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { descadastrarNewsletterSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { z } from "zod";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";

const listarAssinantesQuerySchema = z.object({
  nome: z.string().trim().max(120).optional(),
  limite: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const handlerErro = (fn: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof ErroPersonalizado) {
        res.status(error.status).json({ mensagem: error.message, erros: error.erros });
        return;
      }
      next(error);
    }
  };

export class ListarAssinantesNewsletterRota implements Rotas {
  private constructor(private readonly caso: ListarAssinantesNewsletter) {}
  static criar(caso: ListarAssinantesNewsletter) {
    return new ListarAssinantesNewsletterRota(caso);
  }
  getCaminho() { return "/usuario/newsletter/assinantes"; }
  getMetodo() { return HttpMethod.GET; }
  getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter, autenticarJwt, autorizarAdmin, validarQueryMiddleware(listarAssinantesQuerySchema)];
  }
  getHandler() {
    return handlerErro(async (req, res) => {
      const query = (req.queryValidados || req.query) as { nome?: string; limite?: number; offset?: number };
      res.json(await this.caso.executar({
        nome: query.nome,
        limite: query.limite,
        offset: query.offset,
      }));
    });
  }
}

export class DescadastrarNewsletterRota implements Rotas {
  private constructor(private readonly caso: DescadastrarNewsletter) {}
  static criar(caso: DescadastrarNewsletter) {
    return new DescadastrarNewsletterRota(caso);
  }
  getCaminho() { return "/usuario/newsletter/descadastrar"; }
  getMetodo() { return HttpMethod.POST; }
  getMiddlewares(): RequestHandler[] { return [mutationRateLimiter]; }
  getHandler() {
    return handlerErro(async (req, res) => {
      const dados = validarBody(descadastrarNewsletterSchema, req.body, res);
      if (!dados) return;
      res.json(await this.caso.executar(dados));
    });
  }
}
