import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  AlterarParceiro,
  CriarParceiro,
  ExcluirParceiro,
  ListarParceiros,
} from "../../../../../casosDeUso/site/parceiros";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import {
  alterarParceiroSchema,
  criarParceiroSchema,
  idParamSchema,
} from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter, publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class ListarParceirosRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: ListarParceiros,
  ) {}

  public static criar(servico: ListarParceiros) {
    return new ListarParceirosRota("/site/parceiros", HttpMethod.GET, servico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter]; }

  public getHandler() {
    return async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.servico.executar();
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

export class ListarParceirosAdminRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: ListarParceiros,
  ) {}

  public static criar(servico: ListarParceiros) {
    return new ListarParceirosAdminRota("/site/parceiros/admin/listar", HttpMethod.GET, servico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [autenticarJwt, autorizarAdmin]; }

  public getHandler() {
    return async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.servico.executar({ admin: true });
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

export class CriarParceiroRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: CriarParceiro,
  ) {}

  public static criar(servico: CriarParceiro) {
    return new CriarParceiroRota("/site/parceiros", HttpMethod.POST, servico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt, autorizarAdmin]; }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(criarParceiroSchema, request.body, response);
        if (!dados) return;
        const resultado = await this.servico.executar(dados);
        response.status(201).json({ parceiro: resultado });
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

export class AlterarParceiroRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: AlterarParceiro,
  ) {}

  public static criar(servico: AlterarParceiro) {
    return new AlterarParceiroRota("/site/parceiros/:id", HttpMethod.PUT, servico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, validarParamsMiddleware(idParamSchema), autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(alterarParceiroSchema, request.body, response);
        if (!dados) return;
        const resultado = await this.servico.executar({ id: request.params.id as string, ...dados });
        response.status(200).json({ parceiro: resultado });
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

export class ExcluirParceiroRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: ExcluirParceiro,
  ) {}

  public static criar(servico: ExcluirParceiro) {
    return new ExcluirParceiroRota("/site/parceiros/:id", HttpMethod.DELETE, servico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, validarParamsMiddleware(idParamSchema), autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.servico.executar({ id: request.params.id as string });
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
