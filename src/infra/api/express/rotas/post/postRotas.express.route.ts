import { NextFunction, Request, RequestHandler, Response } from "express";
import { CriarPost } from "../../../../../casosDeUso/post/criarPost";
import { ListarPosts } from "../../../../../casosDeUso/post/listarPosts";
import { ComentarPost } from "../../../../../casosDeUso/post/comentarPost";
import { CurtirPost } from "../../../../../casosDeUso/post/curtirPost";
import { ExcluirPost } from "../../../../../casosDeUso/post/excluirPost";
import { BuscarPost } from "../../../../../casosDeUso/post/buscarPost";
import { EditarPost } from "../../../../../casosDeUso/post/editarPost";
import { criarPostSchema, editarPostSchema, comentarPostSchema, listarPostsQuerySchema, postIdParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { autenticarJwtOpcional } from "../../../../../middlewares/express/autenticarJwtOpcional";
import { autorizarAdmin } from "../../../../../middlewares/express/autorizarAdmin";
import { mutationRateLimiter, publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

const handlerErro = (fn: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => { try { await fn(req, res); } catch (e) { next(e); } };

export class CriarPostRota implements Rotas {
  private constructor(private readonly caso: CriarPost) {}
  static criar(caso: CriarPost) { return new CriarPostRota(caso); }
  getCaminho() { return "/post"; } getMetodo() { return HttpMethod.POST; }
  getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt, autorizarAdmin]; }
  getHandler() { return handlerErro(async (req, res) => { const dados = validarBody(criarPostSchema, req.body, res); if (!dados) return; res.status(201).json(await this.caso.executar({ ...dados, autorId: req.usuario!.id })); }); }
}
export class ListarPostsRota implements Rotas {
  private constructor(private readonly caso: ListarPosts) {} static criar(caso: ListarPosts) { return new ListarPostsRota(caso); }
  getCaminho() { return "/post"; } getMetodo() { return HttpMethod.GET; }
  getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter, autenticarJwtOpcional, validarQueryMiddleware(listarPostsQuerySchema)]; }
  getHandler() { return handlerErro(async (req, res) => { const query = req.queryValidados as { limite: number; offset: number }; res.json(await this.caso.executar({ usuarioId: req.usuario?.id, limite: query.limite, offset: query.offset })); }); }
}
export class BuscarPostRota implements Rotas {
  private constructor(private readonly caso: BuscarPost) {} static criar(caso: BuscarPost) { return new BuscarPostRota(caso); }
  getCaminho() { return "/post/:postId"; } getMetodo() { return HttpMethod.GET; }
  getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter, autenticarJwtOpcional, validarParamsMiddleware(postIdParamSchema)]; }
  getHandler() { return handlerErro(async (req, res) => { res.json(await this.caso.executar({ postId: String(req.params.postId), usuarioId: req.usuario?.id })); }); }
}
export class EditarPostRota implements Rotas {
  private constructor(private readonly caso: EditarPost) {} static criar(caso: EditarPost) { return new EditarPostRota(caso); }
  getCaminho() { return "/post/:postId"; } getMetodo() { return HttpMethod.PUT; }
  getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt, autorizarAdmin, validarParamsMiddleware(postIdParamSchema)]; }
  getHandler() { return handlerErro(async (req, res) => { const dados = validarBody(editarPostSchema, req.body, res); if (!dados) return; res.json(await this.caso.executar({ postId: String(req.params.postId), ...dados, legenda: dados.legenda ?? "" })); }); }
}
export class ComentarPostRota implements Rotas {
  private constructor(private readonly caso: ComentarPost) {} static criar(caso: ComentarPost) { return new ComentarPostRota(caso); }
  getCaminho() { return "/post/:postId/comentario"; } getMetodo() { return HttpMethod.POST; }
  getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt, validarParamsMiddleware(postIdParamSchema)]; }
  getHandler() { return handlerErro(async (req, res) => { const dados = validarBody(comentarPostSchema, req.body, res); if (!dados) return; res.status(201).json(await this.caso.executar({ postId: String(req.params.postId), autorId: req.usuario!.id, texto: dados.texto })); }); }
}
export class CurtirPostRota implements Rotas {
  private constructor(private readonly caso: CurtirPost, private readonly curtir: boolean) {} static criar(caso: CurtirPost, curtir: boolean) { return new CurtirPostRota(caso, curtir); }
  getCaminho() { return "/post/:postId/curtida"; } getMetodo() { return this.curtir ? HttpMethod.POST : HttpMethod.DELETE; }
  getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt, validarParamsMiddleware(postIdParamSchema)]; }
  getHandler() { return handlerErro(async (req, res) => { res.json(await this.caso.executar({ postId: String(req.params.postId), usuarioId: req.usuario!.id, curtir: this.curtir })); }); }
}
export class ExcluirPostRota implements Rotas {
  private constructor(private readonly caso: ExcluirPost) {} static criar(caso: ExcluirPost) { return new ExcluirPostRota(caso); }
  getCaminho() { return "/post/:postId"; } getMetodo() { return HttpMethod.DELETE; }
  getMiddlewares(): RequestHandler[] { return [mutationRateLimiter, autenticarJwt, autorizarAdmin, validarParamsMiddleware(postIdParamSchema)]; }
  getHandler() { return handlerErro(async (req, res) => { res.json(await this.caso.executar({ postId: String(req.params.postId) })); }); }
}
