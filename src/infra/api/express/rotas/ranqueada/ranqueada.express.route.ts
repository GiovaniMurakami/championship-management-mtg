import { NextFunction, Request, RequestHandler, Response } from "express";
import { Ranqueada } from "../../../../../casosDeUso/ranqueada/ranqueada";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { ranqueadaMutationRateLimiter, ranqueadaReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { validarBody } from "../../../../../helpers/validacao/validarBody";
import { contestarResultadoRanqueadaSchema, entrarFilaRanqueadaSchema, formatoRanqueadaQuerySchema, partidaRanqueadaIdParamSchema, resolverContestacaoDeckSchema, resultadoRanqueadaSchema } from "../../../../../helpers/validacao/schemas";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { HttpMethod, Rotas } from "../rotas";

abstract class BaseRanqueadaRota implements Rotas {
  constructor(protected servico: Ranqueada) {}
  abstract getCaminho(): string;
  abstract getMetodo(): HttpMethod;
  public getMiddlewares(): RequestHandler[] { return [ranqueadaMutationRateLimiter, autenticarJwt]; }
  abstract executar(request: Request, response: Response): Promise<void>;
  public getHandler() { return async (req: Request, res: Response, next: NextFunction) => { try { await this.executar(req, res); } catch (error) { if (error instanceof ErroPersonalizado) { res.status(error.status).json({ mensagem: error.message, erros: error.erros }); return; } next(error); } }; }
}

export class EntrarFilaRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new EntrarFilaRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/fila"; } getMetodo() { return HttpMethod.POST; }
  async executar(req: Request, res: Response) { const body = validarBody(entrarFilaRanqueadaSchema, req.body, res); if (!body) return; res.status(200).json(await this.servico.entrarFila({ jogadorId: req.usuario!.id, jogadorNome: req.usuario!.nome, deckId: body.deckId })); }
}
export class SairFilaRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new SairFilaRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/fila"; } getMetodo() { return HttpMethod.DELETE; }
  async executar(req: Request, res: Response) { res.status(200).json(await this.servico.sairFila(req.usuario!.id)); }
}
export class AbandonarCampanhaRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new AbandonarCampanhaRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/campanha"; } getMetodo() { return HttpMethod.DELETE; }
  getMiddlewares() { return [ranqueadaMutationRateLimiter, autenticarJwt, validarQueryMiddleware(formatoRanqueadaQuerySchema)]; }
  async executar(req: Request, res: Response) { res.status(200).json(await this.servico.abandonarCampanha(req.usuario!.id, req.queryValidados?.formato as string)); }
}
export class StatusRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new StatusRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/status"; } getMetodo() { return HttpMethod.GET; }
  getMiddlewares() { return [ranqueadaReadRateLimiter, autenticarJwt, validarQueryMiddleware(formatoRanqueadaQuerySchema)]; }
  async executar(req: Request, res: Response) { res.status(200).json(await this.servico.status(req.usuario!.id, req.queryValidados?.formato as string)); }
}
export class RankingRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new RankingRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/ranking"; } getMetodo() { return HttpMethod.GET; }
  getMiddlewares() { return [ranqueadaReadRateLimiter, autenticarJwt, validarQueryMiddleware(formatoRanqueadaQuerySchema)]; }
  async executar(req: Request, res: Response) { res.status(200).json(await this.servico.ranking(req.queryValidados?.formato as string, req.usuario!.id)); }
}
export class HistoricoRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new HistoricoRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/historico"; } getMetodo() { return HttpMethod.GET; }
  getMiddlewares() { return [ranqueadaReadRateLimiter, autenticarJwt]; }
  async executar(req: Request, res: Response) { res.status(200).json(await this.servico.historico(req.usuario!.id)); }
}
export class ResultadoRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new ResultadoRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/partida/:partidaId/resultado"; } getMetodo() { return HttpMethod.POST; }
  getMiddlewares() { return [ranqueadaMutationRateLimiter, autenticarJwt, validarParamsMiddleware(partidaRanqueadaIdParamSchema)]; }
  async executar(req: Request, res: Response) { const body = validarBody(resultadoRanqueadaSchema, req.body, res); if (!body) return; res.status(200).json(await this.servico.registrarResultado({ jogadorId: req.usuario!.id, partidaId: req.params.partidaId as string, vencedorId: body.vencedorId })); }
}
export class ConfirmarResultadoRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new ConfirmarResultadoRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/partida/:partidaId/confirmar"; } getMetodo() { return HttpMethod.POST; }
  getMiddlewares() { return [ranqueadaMutationRateLimiter, autenticarJwt, validarParamsMiddleware(partidaRanqueadaIdParamSchema)]; }
  async executar(req: Request, res: Response) { res.status(200).json(await this.servico.confirmarResultado({ jogadorId: req.usuario!.id, partidaId: req.params.partidaId as string })); }
}
export class ContestarResultadoRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new ContestarResultadoRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/partida/:partidaId/contestar"; } getMetodo() { return HttpMethod.POST; }
  getMiddlewares() { return [ranqueadaMutationRateLimiter, autenticarJwt, validarParamsMiddleware(partidaRanqueadaIdParamSchema)]; }
  async executar(req: Request, res: Response) { const body = validarBody(contestarResultadoRanqueadaSchema, req.body, res); if (!body) return; res.status(200).json(await this.servico.contestarResultado({ jogadorId: req.usuario!.id, partidaId: req.params.partidaId as string, observacao: body.observacao, evidenciaUrl: body.evidenciaUrl, tipoContestacao: body.tipoContestacao })); }
}
export class AjustarResultadoRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new AjustarResultadoRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/partida/:partidaId/ajustar"; } getMetodo() { return HttpMethod.PUT; }
  getMiddlewares() { return [ranqueadaMutationRateLimiter, autenticarJwt, validarParamsMiddleware(partidaRanqueadaIdParamSchema)]; }
  async executar(req: Request, res: Response) { const body = validarBody(resultadoRanqueadaSchema, req.body, res); if (!body) return; res.status(200).json(await this.servico.ajustarResultado({ usuarioId: req.usuario!.id, isAdmin: req.usuario!.role === "admin", partidaId: req.params.partidaId as string, vencedorId: body.vencedorId })); }
}
export class ListarContestacoesRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new ListarContestacoesRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/contestacoes"; } getMetodo() { return HttpMethod.GET; }
  getMiddlewares() { return [ranqueadaReadRateLimiter, autenticarJwt]; }
  async executar(req: Request, res: Response) { res.status(200).json(await this.servico.listarContestacoes(req.usuario!.role === "admin")); }
}
export class ResolverContestacaoDeckRanqueadaRota extends BaseRanqueadaRota {
  static criar(s: Ranqueada) { return new ResolverContestacaoDeckRanqueadaRota(s); }
  getCaminho() { return "/ranqueada/partida/:partidaId/resolver-deck"; } getMetodo() { return HttpMethod.PUT; }
  getMiddlewares() { return [ranqueadaMutationRateLimiter, autenticarJwt, validarParamsMiddleware(partidaRanqueadaIdParamSchema)]; }
  async executar(req: Request, res: Response) { const body = validarBody(resolverContestacaoDeckSchema, req.body, res); if (!body) return; res.status(200).json(await this.servico.resolverContestacaoDeck({ usuarioId: req.usuario!.id, isAdmin: req.usuario!.role === "admin", partidaId: req.params.partidaId as string, procedente: body.procedente })); }
}
