import { NextFunction, Request, RequestHandler, Response } from "express";
import { CriarArtigo } from "../../../../../casosDeUso/artigo/criarArtigo";
import { ListarArtigos } from "../../../../../casosDeUso/artigo/listarArtigos";
import { BuscarArtigo } from "../../../../../casosDeUso/artigo/buscarArtigo";
import { EditarArtigo } from "../../../../../casosDeUso/artigo/editarArtigo";
import { AprovarArtigo } from "../../../../../casosDeUso/artigo/aprovarArtigo";
import { ComentarArtigo } from "../../../../../casosDeUso/artigo/comentarArtigo";
import { CurtirArtigo } from "../../../../../casosDeUso/artigo/curtirArtigo";
import { CurtirComentarioArtigo } from "../../../../../casosDeUso/artigo/curtirComentarioArtigo";
import { ExcluirArtigo } from "../../../../../casosDeUso/artigo/excluirArtigo";
import {
  aprovarArtigoSchema,
  artigoComentarioParamSchema,
  artigoIdParamSchema,
  comentarArtigoSchema,
  criarArtigoSchema,
  editarArtigoSchema,
  listarArtigosQuerySchema,
} from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autenticarJwtOpcional } from "../../../../../middlewares/express/autenticarJwtOpcional";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { autorizarEditorOuAdmin } from "../../../../../middlewares/express/autorizarEditorOuAdmin";
import { mutationRateLimiter, publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

const handlerErro = (fn: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await fn(req, res); } catch (e) { next(e); }
  };

export class CriarArtigoRota implements Rotas {
  private constructor(private readonly caso: CriarArtigo) {}
  static criar(caso: CriarArtigo) { return new CriarArtigoRota(caso); }
  getCaminho() { return "/artigo"; }
  getMetodo() { return HttpMethod.POST; }
  getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt, autorizarEditorOuAdmin]; }
  getHandler() {
    return handlerErro(async (req, res) => {
      const dados = validarBody(criarArtigoSchema, req.body, res);
      if (!dados) return;
      res.status(201).json(await this.caso.executar({
        ...dados,
        autorId: req.usuario!.id,
        role: req.usuario!.role,
      }));
    });
  }
}

export class ListarArtigosRota implements Rotas {
  private constructor(private readonly caso: ListarArtigos) {}
  static criar(caso: ListarArtigos) { return new ListarArtigosRota(caso); }
  getCaminho() { return "/artigo"; }
  getMetodo() { return HttpMethod.GET; }
  getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter, autenticarJwtOpcional, validarQueryMiddleware(listarArtigosQuerySchema)];
  }
  getHandler() {
    return handlerErro(async (req, res) => {
      const query = req.queryValidados as {
        pendentes?: string;
        status?: "rascunho" | "pendente" | "pendente_edicao" | "publicado" | "rejeitado";
      };
      res.json(await this.caso.executar({
        requisitanteId: req.usuario?.id,
        role: req.usuario?.role,
        pendentes: query.pendentes === "true",
        status: query.status,
      }));
    });
  }
}

export class BuscarArtigoRota implements Rotas {
  private constructor(private readonly caso: BuscarArtigo) {}
  static criar(caso: BuscarArtigo) { return new BuscarArtigoRota(caso); }
  getCaminho() { return "/artigo/:artigoId"; }
  getMetodo() { return HttpMethod.GET; }
  getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter, autenticarJwtOpcional, validarParamsMiddleware(artigoIdParamSchema)];
  }
  getHandler() {
    return handlerErro(async (req, res) => {
      res.json(await this.caso.executar({
        id: String(req.params.artigoId),
        requisitanteId: req.usuario?.id,
        role: req.usuario?.role,
        registrarVisualizacao: true,
      }));
    });
  }
}

export class EditarArtigoRota implements Rotas {
  private constructor(private readonly caso: EditarArtigo) {}
  static criar(caso: EditarArtigo) { return new EditarArtigoRota(caso); }
  getCaminho() { return "/artigo/:artigoId"; }
  getMetodo() { return HttpMethod.PUT; }
  getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarEditorOuAdmin, validarParamsMiddleware(artigoIdParamSchema)];
  }
  getHandler() {
    return handlerErro(async (req, res) => {
      const dados = validarBody(editarArtigoSchema, req.body, res);
      if (!dados) return;
      res.json(await this.caso.executar({
        id: String(req.params.artigoId),
        requisitanteId: req.usuario!.id,
        role: req.usuario!.role,
        ...dados,
      }));
    });
  }
}

export class AprovarArtigoRota implements Rotas {
  private constructor(private readonly caso: AprovarArtigo) {}
  static criar(caso: AprovarArtigo) { return new AprovarArtigoRota(caso); }
  getCaminho() { return "/artigo/:artigoId/aprovacao"; }
  getMetodo() { return HttpMethod.POST; }
  getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin, validarParamsMiddleware(artigoIdParamSchema)];
  }
  getHandler() {
    return handlerErro(async (req, res) => {
      const dados = validarBody(aprovarArtigoSchema, req.body, res);
      if (!dados) return;
      res.json(await this.caso.executar({
        id: String(req.params.artigoId),
        role: req.usuario!.role,
        aprovar: dados.aprovar,
      }));
    });
  }
}

export class ComentarArtigoRota implements Rotas {
  private constructor(private readonly caso: ComentarArtigo) {}
  static criar(caso: ComentarArtigo) { return new ComentarArtigoRota(caso); }
  getCaminho() { return "/artigo/:artigoId/comentario"; }
  getMetodo() { return HttpMethod.POST; }
  getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, validarParamsMiddleware(artigoIdParamSchema)];
  }
  getHandler() {
    return handlerErro(async (req, res) => {
      const dados = validarBody(comentarArtigoSchema, req.body, res);
      if (!dados) return;
      res.status(201).json(await this.caso.executar({
        artigoId: String(req.params.artigoId),
        autorId: req.usuario!.id,
        texto: dados.texto,
        comentarioPaiId: dados.comentarioPaiId,
      }));
    });
  }
}

export class CurtirArtigoRota implements Rotas {
  private constructor(private readonly caso: CurtirArtigo, private readonly curtir: boolean) {}
  static criar(caso: CurtirArtigo, curtir: boolean) { return new CurtirArtigoRota(caso, curtir); }
  getCaminho() { return "/artigo/:artigoId/curtida"; }
  getMetodo() { return this.curtir ? HttpMethod.POST : HttpMethod.DELETE; }
  getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, validarParamsMiddleware(artigoIdParamSchema)];
  }
  getHandler() {
    return handlerErro(async (req, res) => {
      res.json(await this.caso.executar({
        artigoId: String(req.params.artigoId),
        usuarioId: req.usuario!.id,
        curtir: this.curtir,
      }));
    });
  }
}

export class CurtirComentarioArtigoRota implements Rotas {
  private constructor(private readonly caso: CurtirComentarioArtigo, private readonly curtir: boolean) {}
  static criar(caso: CurtirComentarioArtigo, curtir: boolean) { return new CurtirComentarioArtigoRota(caso, curtir); }
  getCaminho() { return "/artigo/:artigoId/comentario/:comentarioId/curtida"; }
  getMetodo() { return this.curtir ? HttpMethod.POST : HttpMethod.DELETE; }
  getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, validarParamsMiddleware(artigoComentarioParamSchema)];
  }
  getHandler() {
    return handlerErro(async (req, res) => {
      res.json(await this.caso.executar({
        artigoId: String(req.params.artigoId),
        comentarioId: String(req.params.comentarioId),
        usuarioId: req.usuario!.id,
        curtir: this.curtir,
      }));
    });
  }
}

export class ExcluirArtigoRota implements Rotas {
  private constructor(private readonly caso: ExcluirArtigo) {}
  static criar(caso: ExcluirArtigo) { return new ExcluirArtigoRota(caso); }
  getCaminho() { return "/artigo/:artigoId"; }
  getMetodo() { return HttpMethod.DELETE; }
  getMiddlewares(): RequestHandler[] {
    return [mutationRateLimiter, autenticarJwt, autorizarAdmin, validarParamsMiddleware(artigoIdParamSchema)];
  }
  getHandler() {
    return handlerErro(async (req, res) => {
      res.json(await this.caso.executar({ id: String(req.params.artigoId), role: req.usuario!.role }));
    });
  }
}
