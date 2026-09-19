import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarAnuncioDiario } from "../../../../../casosDeUso/site/buscarAnuncioDiario";
import { SalvarAnuncioDiario } from "../../../../../casosDeUso/site/salvarAnuncioDiario";
import {
  RegistrarCliqueAnuncioDiario,
  RegistrarVisualizacaoAnuncioDiario,
} from "../../../../../casosDeUso/site/registrarMetricasAnuncioDiario";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { salvarAnuncioDiarioSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter, publicActionRateLimiter, publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

const handlerErro = (fn: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await fn(req, res); } catch (error) {
      if (error instanceof ErroPersonalizado) {
        res.status(error.status).json({ mensagem: error.message, erros: error.erros });
        return;
      }
      next(error);
    }
  };

export class BuscarAnuncioDiarioRota implements Rotas {
  private constructor(private readonly caso: BuscarAnuncioDiario) {}
  static criar(caso: BuscarAnuncioDiario) { return new BuscarAnuncioDiarioRota(caso); }
  getCaminho() { return "/site/anuncio-diario"; }
  getMetodo() { return HttpMethod.GET; }
  getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter]; }
  getHandler() {
    return handlerErro(async (_req, res) => {
      res.json(await this.caso.executar({ incluirMetricas: false }));
    });
  }
}

export class BuscarAnuncioDiarioAdminRota implements Rotas {
  private constructor(private readonly caso: BuscarAnuncioDiario) {}
  static criar(caso: BuscarAnuncioDiario) { return new BuscarAnuncioDiarioAdminRota(caso); }
  getCaminho() { return "/site/anuncio-diario/admin"; }
  getMetodo() { return HttpMethod.GET; }
  getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter, autenticarJwt, autorizarAdmin]; }
  getHandler() {
    return handlerErro(async (_req, res) => {
      res.json(await this.caso.executar({ incluirMetricas: true }));
    });
  }
}

export class SalvarAnuncioDiarioRota implements Rotas {
  private constructor(private readonly caso: SalvarAnuncioDiario) {}
  static criar(caso: SalvarAnuncioDiario) { return new SalvarAnuncioDiarioRota(caso); }
  getCaminho() { return "/site/anuncio-diario"; }
  getMetodo() { return HttpMethod.PUT; }
  getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt, autorizarAdmin]; }
  getHandler() {
    return handlerErro(async (req, res) => {
      const dados = validarBody(salvarAnuncioDiarioSchema, req.body, res);
      if (!dados) return;
      res.json(await this.caso.executar(dados));
    });
  }
}

export class RegistrarVisualizacaoAnuncioDiarioRota implements Rotas {
  private constructor(private readonly caso: RegistrarVisualizacaoAnuncioDiario) {}
  static criar(caso: RegistrarVisualizacaoAnuncioDiario) {
    return new RegistrarVisualizacaoAnuncioDiarioRota(caso);
  }
  getCaminho() { return "/site/anuncio-diario/visualizacao"; }
  getMetodo() { return HttpMethod.POST; }
  getMiddlewares(): RequestHandler[] { return [publicActionRateLimiter]; }
  getHandler() {
    return handlerErro(async (_req, res) => {
      res.json(await this.caso.executar());
    });
  }
}

export class RegistrarCliqueAnuncioDiarioRota implements Rotas {
  private constructor(private readonly caso: RegistrarCliqueAnuncioDiario) {}
  static criar(caso: RegistrarCliqueAnuncioDiario) {
    return new RegistrarCliqueAnuncioDiarioRota(caso);
  }
  getCaminho() { return "/site/anuncio-diario/clique"; }
  getMetodo() { return HttpMethod.POST; }
  getMiddlewares(): RequestHandler[] { return [publicActionRateLimiter]; }
  getHandler() {
    return handlerErro(async (_req, res) => {
      res.json(await this.caso.executar());
    });
  }
}
