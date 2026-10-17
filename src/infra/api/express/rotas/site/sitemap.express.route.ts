import { NextFunction, Request, RequestHandler, Response } from "express";
import { GerarSitemap, montarXmlSitemap } from "../../../../../casosDeUso/site/gerarSitemap";
import { getFrontendUrl } from "../../../../../helpers/env";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { HttpMethod, Rotas } from "../rotas";

function hostFrontendPermitido(requestHost: string, amplifyAppId: string): boolean {
  return requestHost === "tiagofuguete.com.br"
    || requestHost === "www.tiagofuguete.com.br"
    || requestHost === "homolog.tiagofuguete.com.br"
    || requestHost === "www.homolog.tiagofuguete.com.br"
    || requestHost === "app.tiagofuguete.com.br"
    || requestHost === "www.app.tiagofuguete.com.br"
    || requestHost === `${amplifyAppId}.amplifyapp.com`
    || requestHost.endsWith(`.${amplifyAppId}.amplifyapp.com`);
}

export class SitemapXmlRota implements Rotas {
  private constructor(private readonly caso: GerarSitemap) {}

  public static criar(caso: GerarSitemap) {
    return new SitemapXmlRota(caso);
  }

  public getCaminho() { return "/site/sitemap.xml"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter]; }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const resultado = await this.caso.executar();
        const forwardedHost = String(request.headers["x-forwarded-host"] || "").split(",")[0].trim().toLowerCase();
        const requestHost = forwardedHost || request.hostname.toLowerCase();
        const amplifyAppId = process.env.AMPLIFY_APP_ID || "d32mjk9mbam2cb";
        const baseFromHost = hostFrontendPermitido(requestHost, amplifyAppId)
          ? `https://${requestHost}`
          : getFrontendUrl();

        // Recria locs com o host do Amplify quando o rewrite encaminha o Host.
        const basePadrao = resultado.baseUrl.replace(/\/+$/, "");
        const baseAlvo = baseFromHost.replace(/\/+$/, "");
        const urls = basePadrao === baseAlvo
          ? resultado.urls
          : resultado.urls.map((u) => ({
            ...u,
            loc: u.loc.replace(basePadrao, baseAlvo),
          }));

        response.set("Content-Type", "application/xml; charset=utf-8");
        response.set("Cache-Control", "public, max-age=300");
        response.status(200).send(montarXmlSitemap(urls));
      } catch (error) {
        next(error);
      }
    };
  }
}

export class RobotsTxtRota implements Rotas {
  public static criar() {
    return new RobotsTxtRota();
  }

  public getCaminho() { return "/site/robots.txt"; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter]; }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const forwardedHost = String(request.headers["x-forwarded-host"] || "").split(",")[0].trim().toLowerCase();
        const requestHost = forwardedHost || request.hostname.toLowerCase();
        const amplifyAppId = process.env.AMPLIFY_APP_ID || "d32mjk9mbam2cb";
        const base = hostFrontendPermitido(requestHost, amplifyAppId)
          ? `https://${requestHost}`
          : getFrontendUrl().replace(/\/+$/, "");

        const corpo = `User-agent: *
Allow: /

Disallow: /dashboard
Disallow: /dashboard/
Disallow: /torneios/criar
Disallow: /artigos/novo
Disallow: /artigos/pendentes
Disallow: /artigos/*/editar
Disallow: /esqueci-senha
Disallow: /reset-senha
Disallow: /torneio/ingressar
Disallow: /newsletter/

Sitemap: ${base.replace(/\/+$/, "")}/sitemap.xml
`;

        response.set("Content-Type", "text/plain; charset=utf-8");
        response.set("Cache-Control", "public, max-age=3600");
        response.status(200).send(corpo);
      } catch (error) {
        next(error);
      }
    };
  }
}
