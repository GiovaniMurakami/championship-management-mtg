import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarSeoArtigo } from "../../../../../casosDeUso/artigo/buscarSeoArtigo";
import { getFrontendUrl } from "../../../../../helpers/env";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";
import {
  HTML_SHELL_COMPARTILHAMENTO,
  montarHtmlCompartilhamento,
} from "../torneio/renderizarCompartilhamentoTorneio.express.route";

const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/ç/gi, "c").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function montarHtmlCompartilhamentoArtigo(
  seo: Awaited<ReturnType<BuscarSeoArtigo["executar"]>>,
  indexHtml = HTML_SHELL_COMPARTILHAMENTO,
  frontendUrl = getFrontendUrl(),
): string {
  return montarHtmlCompartilhamento({
    canonicalPath: `/artigos/${seo.artigoId.slice(0, 5)}-${slugify(seo.title)}`,
    title: seo.title,
    description: seo.description,
    image: seo.image,
    imageType: seo.imageType,
    fallbackDescription: "Leia este artigo no blog do Fuguete Liga Magic.",
    mensagemErro: "Não foi possível carregar o artigo. Atualize a página.",
  }, indexHtml, frontendUrl);
}

function removerCabecalhosDaApi(response: Response) {
  response.removeHeader("Content-Security-Policy");
  response.removeHeader("X-Frame-Options");
  response.removeHeader("Cross-Origin-Resource-Policy");
  response.removeHeader("Cross-Origin-Opener-Policy");
  response.removeHeader("Origin-Agent-Cluster");
}

export class RenderizarCompartilhamentoArtigoRota implements Rotas {
  private constructor(
    private readonly servico: BuscarSeoArtigo,
    private readonly caminho = "/artigo/:artigoId/share",
  ) {}

  public static criar(servico: BuscarSeoArtigo, caminho?: string) {
    return new RenderizarCompartilhamentoArtigoRota(servico, caminho);
  }

  public getCaminho() { return this.caminho; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter];
  }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const forwardedHost = String(request.headers["x-forwarded-host"] || "").split(",")[0].trim().toLowerCase();
        const requestHost = forwardedHost || request.hostname.toLowerCase();
        const amplifyAppId = process.env.AMPLIFY_APP_ID || "d32mjk9mbam2cb";
        const hostPermitido = requestHost === "app.tiagofuguete.com.br"
          || requestHost === "www.app.tiagofuguete.com.br"
          || requestHost === `${amplifyAppId}.amplifyapp.com`
          || requestHost.endsWith(`.${amplifyAppId}.amplifyapp.com`);
        const frontendUrl = hostPermitido ? `https://${requestHost}` : getFrontendUrl();
        const homolog = requestHost === "app.tiagofuguete.com.br"
          || requestHost === "www.app.tiagofuguete.com.br"
          || requestHost.startsWith("homolog.");
        const artigoId = String(request.params.artigoId);
        const pareceArtigo = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[a-z0-9]{5}-[a-z0-9-]+)$/i.test(artigoId);
        const homologApiUrl = (process.env.SEO_HOMOLOG_API_URL || "https://ol5gj7iduc.execute-api.us-east-1.amazonaws.com/dev").replace(/\/+$/, "");
        let seo: Awaited<ReturnType<BuscarSeoArtigo["executar"]>> | null = null;
        if (pareceArtigo) {
          try {
            seo = homolog
              ? await fetch(`${homologApiUrl}/artigo/${encodeURIComponent(artigoId)}/seo`, { headers: { Accept: "application/json" } })
                .then(async (resposta) => {
                  if (!resposta.ok) return null;
                  return resposta.json() as ReturnType<BuscarSeoArtigo["executar"]>;
                })
              : await this.servico.executar({ artigoId });
          } catch {
            seo = null;
          }
        }
        const html = seo
          ? montarHtmlCompartilhamentoArtigo(seo, HTML_SHELL_COMPARTILHAMENTO, frontendUrl)
          : montarHtmlCompartilhamento({
            canonicalPath: "/artigos",
            title: "Artigos",
            description: null,
            image: null,
            imageType: null,
            fallbackDescription: "Artigos do Fuguete Liga Magic.",
            mensagemErro: "Não foi possível carregar a página. Atualize a página.",
          }, HTML_SHELL_COMPARTILHAMENTO, frontendUrl);
        removerCabecalhosDaApi(response);
        response.set("Content-Type", "text/html; charset=utf-8");
        response.set("Cache-Control", "private, no-store, must-revalidate");
        response.set("Vary", "Host, X-Forwarded-Host");
        response.status(200).send(html);
      } catch (error) { next(error); }
    };
  }
}
