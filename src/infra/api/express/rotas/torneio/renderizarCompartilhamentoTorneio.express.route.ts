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

let indexHtmlCache: { html: string; expiresAt: number } | null = null;

async function buscarIndexHtml(frontendUrl: string): Promise<string> {
  if (indexHtmlCache && indexHtmlCache.expiresAt > Date.now() && indexHtmlCache.html.includes(`data-ssr-origin="${escapeHtml(frontendUrl)}"`)) return indexHtmlCache.html;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${frontendUrl.replace(/\/+$/, "")}/`, {
      headers: { Accept: "text/html", "User-Agent": "championship-mtg-social-renderer/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`frontend respondeu HTTP ${response.status}`);
    const html = (await response.text()).replace("<head>", `<head><meta data-ssr-origin="${escapeHtml(frontendUrl)}">`);
    if (!html.includes("</head>")) throw new Error("index.html do frontend inválido");
    indexHtmlCache = { html, expiresAt: Date.now() + 5 * 60 * 1000 };
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

export function montarHtmlCompartilhamentoTorneio(
  seo: Awaited<ReturnType<BuscarSeoTorneio["executar"]>>,
  indexHtml = "<!doctype html><html lang=\"pt-BR\"><head></head><body><div id=\"root\"></div></body></html>",
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
  const metaTags = `<title>${title}</title><meta name="description" content="${description}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website"><meta property="og:site_name" content="Fuguete Liga Magic">
  <meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
  <meta property="og:url" content="${escapeHtml(canonical)}">${imageTags}
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">`;
  return indexHtml
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/i, "")
    .replace(/<meta\s+(?:property=["']og:[^"']+["']|name=["']twitter:[^"']+["'])[^>]*>\s*/gi, "")
    .replace("</head>", `${metaTags}</head>`);
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
        const seoPromise = homolog
          ? fetch(`${homologApiUrl}/torneio/${encodeURIComponent(torneioId)}/seo`, { headers: { Accept: "application/json" } })
            .then(async (resposta) => {
              if (!resposta.ok) throw new Error(`SEO homolog respondeu HTTP ${resposta.status}`);
              return resposta.json() as ReturnType<BuscarSeoTorneio["executar"]>;
            })
          : this.servico.executar({ torneioId });
        const [seo, indexHtml] = await Promise.all([
          seoPromise,
          buscarIndexHtml(frontendUrl),
        ]);
        // Esta resposta inicializa o SPA hospedado no Amplify. A CSP padrão do
        // Helmet foi criada para a API e bloquearia as conexões do frontend com
        // API, Ably, S3 e demais origens já permitidas pelo próprio aplicativo.
        response.removeHeader("Content-Security-Policy");
        response.set("Content-Type", "text/html; charset=utf-8");
        response.set("Cache-Control", "public, max-age=300, s-maxage=1800");
        response.set("Vary", "Host, X-Forwarded-Host");
        response.status(200).send(montarHtmlCompartilhamentoTorneio(seo, indexHtml, frontendUrl));
      } catch (error) { next(error); }
    };
  }
}
