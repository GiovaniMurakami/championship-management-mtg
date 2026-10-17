import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarConteudoHome } from "../../../../../casosDeUso/site/buscarConteudoHome";
import { BuscarParceiros } from "../../../../../casosDeUso/site/buscarParceiros";
import { BuscarSlidesHome } from "../../../../../casosDeUso/site/buscarSlidesHome";
import { BuscarSobreMim } from "../../../../../casosDeUso/site/buscarSobreMim";
import { SalvarConteudoHome } from "../../../../../casosDeUso/site/salvarConteudoHome";
import { SalvarParceiros } from "../../../../../casosDeUso/site/salvarParceiros";
import { SalvarSlidesHome } from "../../../../../casosDeUso/site/salvarSlidesHome";
import { SalvarSobreMim } from "../../../../../casosDeUso/site/salvarSobreMim";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import {
  salvarConteudoHomeSchema,
  salvarParceirosSchema,
  salvarSlidesHomeSchema,
  salvarSobreMimSchema,
} from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter, publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class BuscarSlidesHomeRota implements Rotas {
  private constructor(private readonly caso: BuscarSlidesHome) {}
  public static criar(caso: BuscarSlidesHome) {
    return new BuscarSlidesHomeRota(caso);
  }
  public getCaminho() { return "/site/home-slides"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter]; }
  public getHandler() {
    return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        res.json(await this.caso.executar());
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          res.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}

export class BuscarSlidesHomeAdminRota implements Rotas {
  private constructor(private readonly caso: BuscarSlidesHome) {}
  public static criar(caso: BuscarSlidesHome) {
    return new BuscarSlidesHomeAdminRota(caso);
  }
  public getCaminho() { return "/site/home-slides/admin"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter, autenticarJwt, autorizarAdmin];
  }
  public getHandler() {
    return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        res.json(await this.caso.executar({ incluirInativos: true }));
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          res.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}

export class SalvarSlidesHomeRota implements Rotas {
  private constructor(private readonly caso: SalvarSlidesHome) {}
  public static criar(caso: SalvarSlidesHome) {
    return new SalvarSlidesHomeRota(caso);
  }
  public getCaminho() { return "/site/home-slides"; }
  public getMetodo() { return HttpMethod.PUT; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin];
  }
  public getHandler() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(salvarSlidesHomeSchema, req.body, res);
        if (!dados) return;
        res.json(await this.caso.executar({ slides: dados.slides }));
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          res.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}

export class BuscarParceirosRota implements Rotas {
  private constructor(private readonly caso: BuscarParceiros) {}
  public static criar(caso: BuscarParceiros) {
    return new BuscarParceirosRota(caso);
  }
  public getCaminho() { return "/site/parceiros"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter]; }
  public getHandler() {
    return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        res.json(await this.caso.executar());
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          res.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}

export class BuscarParceirosAdminRota implements Rotas {
  private constructor(private readonly caso: BuscarParceiros) {}
  public static criar(caso: BuscarParceiros) {
    return new BuscarParceirosAdminRota(caso);
  }
  public getCaminho() { return "/site/parceiros/admin"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter, autenticarJwt, autorizarAdmin];
  }
  public getHandler() {
    return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        res.json(await this.caso.executar({ incluirInativos: true }));
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          res.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}

export class SalvarParceirosRota implements Rotas {
  private constructor(private readonly caso: SalvarParceiros) {}
  public static criar(caso: SalvarParceiros) {
    return new SalvarParceirosRota(caso);
  }
  public getCaminho() { return "/site/parceiros"; }
  public getMetodo() { return HttpMethod.PUT; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin];
  }
  public getHandler() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(salvarParceirosSchema, req.body, res);
        if (!dados) return;
        res.json(await this.caso.executar({
          parceiros: dados.parceiros,
          cupomGlobal: dados.cupomGlobal,
          paginaTitulo: dados.paginaTitulo,
          paginaTexto: dados.paginaTexto,
          ctaTitulo: dados.ctaTitulo,
          ctaTexto: dados.ctaTexto,
          contatoEmail: dados.contatoEmail,
        }));
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          res.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}

export class BuscarSobreMimRota implements Rotas {
  private constructor(private readonly caso: BuscarSobreMim) {}
  public static criar(caso: BuscarSobreMim) {
    return new BuscarSobreMimRota(caso);
  }
  public getCaminho() { return "/site/sobre-mim"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter]; }
  public getHandler() {
    return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        res.json(await this.caso.executar());
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          res.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}

export class SalvarSobreMimRota implements Rotas {
  private constructor(private readonly caso: SalvarSobreMim) {}
  public static criar(caso: SalvarSobreMim) {
    return new SalvarSobreMimRota(caso);
  }
  public getCaminho() { return "/site/sobre-mim"; }
  public getMetodo() { return HttpMethod.PUT; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin];
  }
  public getHandler() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(salvarSobreMimSchema, req.body, res);
        if (!dados) return;
        res.json(await this.caso.executar(dados));
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          res.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}

export class BuscarConteudoHomeRota implements Rotas {
  private constructor(private readonly caso: BuscarConteudoHome) {}
  public static criar(caso: BuscarConteudoHome) {
    return new BuscarConteudoHomeRota(caso);
  }
  public getCaminho() { return "/site/home-conteudo"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter]; }
  public getHandler() {
    return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        res.json(await this.caso.executar());
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          res.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}

export class SalvarConteudoHomeRota implements Rotas {
  private constructor(private readonly caso: SalvarConteudoHome) {}
  public static criar(caso: SalvarConteudoHome) {
    return new SalvarConteudoHomeRota(caso);
  }
  public getCaminho() { return "/site/home-conteudo"; }
  public getMetodo() { return HttpMethod.PUT; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin];
  }
  public getHandler() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(salvarConteudoHomeSchema, req.body, res);
        if (!dados) return;
        res.json(await this.caso.executar(dados));
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          res.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}
