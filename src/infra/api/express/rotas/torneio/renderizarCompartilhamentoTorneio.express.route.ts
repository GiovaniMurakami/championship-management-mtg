import { NextFunction, Request, RequestHandler, Response } from "express";
import { BuscarSeoTorneio } from "../../../../../casosDeUso/torneio/buscarSeoTorneio";
import { getFrontendUrl } from "../../../../../helpers/env";
import { torneioIdOuSlugParamSchema } from "../../../../../helpers/validacao/schemas";
import { validarParamsMiddleware } from "../../../../../helpers/validacao/validarParams";
import { torneioReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/ç/gi, "c").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const HTML_SHELL_COMPARTILHAMENTO =
  '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div></body></html>';

function removerAssetsComHash(html: string): string {
  return html
    .replace(/<script\b[^>]*\bsrc=["'][^"']*\/assets\/[^"']+["'][^>]*>\s*<\/script>/gi, "")
    .replace(/<link\b[^>]*(?:rel=["'](?:stylesheet|modulepreload)["'][^>]*href=["'][^"']*\/assets\/[^"']+["']|href=["'][^"']*\/assets\/[^"']+["'][^>]*rel=["'](?:stylesheet|modulepreload)["'])[^>]*>/gi, "");
}

/** Carrega o bundle atual da SPA no cliente, sem embutir hashes que quebram após o deploy. */
export function scriptBootstrapSpa(frontendUrl: string): string {
  const origin = JSON.stringify(frontendUrl.replace(/\/+$/, ""));
  return `<script data-ssr-bootstrap="spa">(function(){var o=${origin};function boot(html){var c=html.match(/href="(\\/assets\\/[^"]+\\.css)"/);if(c){var l=document.createElement("link");l.rel="stylesheet";l.crossOrigin="";l.href=c[1];document.head.appendChild(l);}var j=html.match(/src="(\\/assets\\/index-[^"]+\\.js)"/);if(!j)throw new Error("bundle");var s=document.createElement("script");s.type="module";s.crossOrigin="";s.src=j[1];document.head.appendChild(s);}fetch(o+"/?ssr="+Date.now(),{cache:"no-store",headers:{Accept:"text/html"}}).then(function(r){if(!r.ok)throw new Error("spa");return r.text();}).then(boot).catch(function(){var el=document.getElementById("root");if(el)el.textContent="Não foi possível carregar o torneio. Atualize a página.";});})();</script>`;
}

export function montarHtmlCompartilhamentoTorneio(
  seo: Awaited<ReturnType<BuscarSeoTorneio["executar"]>>,
  indexHtml = HTML_SHELL_COMPARTILHAMENTO,
  frontendUrl = getFrontendUrl(),
): string {
  const appUrl = frontendUrl.replace(/\/+$/, "");
  const canonical = `${appUrl}/torneios/${seo.torneioId.slice(0, 5)}-${slugify(seo.title)}`;
  const title = escapeHtml(`${seo.title} | Fuguete Liga Magic`);
  const description = escapeHtml(seo.description || "Acompanhe inscrições, rodadas e resultados deste torneio.");
  const image = seo.image ? escapeHtml(seo.image) : "";
  const imageTags = image ? `
  <meta property="og:image" content="${image}">
  <meta property="og:image:type" content="${escapeHtml(seo.imageType || "image/jpeg")}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:image" content="${image}">` : "";
  const metaTags = `<meta data-ssr-origin="${escapeHtml(appUrl)}"><title>${title}</title><meta name="description" content="${description}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website"><meta property="og:site_name" content="Fuguete Liga Magic">
  <meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
  <meta property="og:url" content="${escapeHtml(canonical)}">${imageTags}
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">${scriptBootstrapSpa(appUrl)}`;
  return removerAssetsComHash(indexHtml)
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/i, "")
    .replace(/<meta\s+data-ssr-origin=["'][^"']*["'][^>]*>/i, "")
    .replace(/<script[^>]*data-ssr-bootstrap=["']spa["'][^>]*>[\s\S]*?<\/script>/i, "")
    .replace(/<meta\s+(?:property=["']og:[^"']+["']|name=["']twitter:[^"']+["'])[^>]*>\s*/gi, "")
    .replace("</head>", `${metaTags}</head>`);
}

function removerCabecalhosDaApi(response: Response) {
  // Helmet da API quebra o SPA: CSP, iframe do WordPress e assets em outro path.
  response.removeHeader("Content-Security-Policy");
  response.removeHeader("X-Frame-Options");
  response.removeHeader("Cross-Origin-Resource-Policy");
  response.removeHeader("Cross-Origin-Opener-Policy");
  response.removeHeader("Origin-Agent-Cluster");
}

export class RenderizarCompartilhamentoTorneioRota implements Rotas {
  private constructor(
    private readonly servico: BuscarSeoTorneio,
    private readonly caminho = "/torneio/:torneioId/share",
  ) {}
  public static criar(servico: BuscarSeoTorneio, caminho?: string) { return new RenderizarCompartilhamentoTorneioRota(servico, caminho); }
  public getCaminho() { return this.caminho; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] { return [validarParamsMiddleware(torneioIdOuSlugParamSchema), torneioReadRateLimiter]; }
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
        const torneioId = request.params.torneioId as string;
        const homologApiUrl = (process.env.SEO_HOMOLOG_API_URL || "https://ol5gj7iduc.execute-api.us-east-1.amazonaws.com/dev").replace(/\/+$/, "");
        const seo = homolog
          ? await fetch(`${homologApiUrl}/torneio/${encodeURIComponent(torneioId)}/seo`, { headers: { Accept: "application/json" } })
            .then(async (resposta) => {
              if (!resposta.ok) throw new Error(`SEO homolog respondeu HTTP ${resposta.status}`);
              return resposta.json() as ReturnType<BuscarSeoTorneio["executar"]>;
            })
          : await this.servico.executar({ torneioId });
        removerCabecalhosDaApi(response);
        response.set("Content-Type", "text/html; charset=utf-8");
        // HTML sem hashes de asset: crawlers leem OG; o browser busca o bundle atual.
        // no-store evita servir HTML antigo com <script src="/assets/index-HASH.js"> 404.
        response.set("Cache-Control", "private, no-store, must-revalidate");
        response.set("Vary", "Host, X-Forwarded-Host");
        response.status(200).send(montarHtmlCompartilhamentoTorneio(seo, HTML_SHELL_COMPARTILHAMENTO, frontendUrl));
      } catch (error) { next(error); }
    };
  }
}
