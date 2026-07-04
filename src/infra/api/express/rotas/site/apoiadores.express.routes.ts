import { NextFunction, Request, RequestHandler, Response } from "express";
import {
  AlterarApoiador,
  CriarApoiador,
  ExcluirApoiador,
  ListarApoiadores,
} from "../../../../../casosDeUso/site/apoiadores";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import {
  alterarApoiadorSchema,
  criarApoiadorSchema,
  idParamSchema,
} from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter, publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

export class ListarApoiadoresRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: ListarApoiadores,
  ) {}

  public static criar(servico: ListarApoiadores) {
    return new ListarApoiadoresRota("/site/apoiadores", HttpMethod.GET, servico);
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

export class ListarApoiadoresAdminRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: ListarApoiadores,
  ) {}

  public static criar(servico: ListarApoiadores) {
    return new ListarApoiadoresAdminRota("/site/apoiadores/admin/listar", HttpMethod.GET, servico);
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

export class CriarApoiadorRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: CriarApoiador,
  ) {}

  public static criar(servico: CriarApoiador) {
    return new CriarApoiadorRota("/site/apoiadores", HttpMethod.POST, servico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt, autorizarAdmin]; }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(criarApoiadorSchema, request.body, response);
        if (!dados) return;
        const resultado = await this.servico.executar(dados);
        response.status(201).json({ apoiador: resultado });
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

export class AlterarApoiadorRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: AlterarApoiador,
  ) {}

  public static criar(servico: AlterarApoiador) {
    return new AlterarApoiadorRota("/site/apoiadores/:id", HttpMethod.PUT, servico);
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, validarParamsMiddleware(idParamSchema), autenticarJwt, autorizarAdmin];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const dados = validarBody(alterarApoiadorSchema, request.body, response);
        if (!dados) return;
        const resultado = await this.servico.executar({ id: request.params.id as string, ...dados });
        response.status(200).json({ apoiador: resultado });
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

export class ExcluirApoiadorRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly servico: ExcluirApoiador,
  ) {}

  public static criar(servico: ExcluirApoiador) {
    return new ExcluirApoiadorRota("/site/apoiadores/:id", HttpMethod.DELETE, servico);
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
