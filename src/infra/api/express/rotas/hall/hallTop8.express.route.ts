import { NextFunction, Request, RequestHandler, Response } from "express";
import { AtualizarHallTop8 } from "../../../../../casosDeUso/hall/atualizarHallTop8";
import { CadastrarHallTop8 } from "../../../../../casosDeUso/hall/cadastrarHallTop8";
import { ExcluirHallTop8 } from "../../../../../casosDeUso/hall/excluirHallTop8";
import { ListarHallTop8 } from "../../../../../casosDeUso/hall/listarHallTop8";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import {
  atualizarHallTop8Schema,
  cadastrarHallTop8Schema,
  hallTop8IdParamSchema,
  listarHallTop8QuerySchema,
} from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter, publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class ListarHallTop8Rota implements Rotas {
  private constructor(private readonly caso: ListarHallTop8) {}
  public static criar(caso: ListarHallTop8) {
    return new ListarHallTop8Rota(caso);
  }
  public getCaminho() { return "/hall-da-fama"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter, validarQueryMiddleware(listarHallTop8QuerySchema)];
  }
  public getHandler() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const query = req.queryValidados as { limite: number; offset: number };
        res.json(await this.caso.executar(query));
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

export class CadastrarHallTop8Rota implements Rotas {
  private constructor(private readonly caso: CadastrarHallTop8) {}
  public static criar(caso: CadastrarHallTop8) {
    return new CadastrarHallTop8Rota(caso);
  }
  public getCaminho() { return "/hall-da-fama"; }
  public getMetodo() { return HttpMethod.POST; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin];
  }
  public getHandler() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(cadastrarHallTop8Schema, req.body, res);
        if (!dados) return;
        res.status(201).json(await this.caso.executar(dados));
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

export class AtualizarHallTop8Rota implements Rotas {
  private constructor(private readonly caso: AtualizarHallTop8) {}
  public static criar(caso: AtualizarHallTop8) {
    return new AtualizarHallTop8Rota(caso);
  }
  public getCaminho() { return "/hall-da-fama/:id"; }
  public getMetodo() { return HttpMethod.PATCH; }
  public getMiddlewares(): RequestHandler[] {
    return [
      mutationRateLimiter,
      autenticarJwt,
      autorizarAdmin,
      validarParamsMiddleware(hallTop8IdParamSchema),
    ];
  }
  public getHandler() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(atualizarHallTop8Schema, req.body, res);
        if (!dados) return;
        res.json(await this.caso.executar({ id: String(req.params.id), ...dados }));
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

export class ExcluirHallTop8Rota implements Rotas {
  private constructor(private readonly caso: ExcluirHallTop8) {}
  public static criar(caso: ExcluirHallTop8) {
    return new ExcluirHallTop8Rota(caso);
  }
  public getCaminho() { return "/hall-da-fama/:id"; }
  public getMetodo() { return HttpMethod.DELETE; }
  public getMiddlewares(): RequestHandler[] {
    return [
      mutationRateLimiter,
      autenticarJwt,
      autorizarAdmin,
      validarParamsMiddleware(hallTop8IdParamSchema),
    ];
  }
  public getHandler() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        res.json(await this.caso.executar({ id: String(req.params.id) }));
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
