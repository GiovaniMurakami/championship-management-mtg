import { NextFunction, Request, RequestHandler, Response } from "express";
import { getFrontendUrl } from "../../../../../helpers/env";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import {
  HTML_SHELL_COMPARTILHAMENTO,
  montarHtmlCompartilhamento,
} from "../torneio/renderizarCompartilhamentoTorneio.express.route";
import { HttpMethod, Rotas } from "../rotas";

type LandingSeo = {
  path: string;
  title: string;
  description: string;
};

const LANDING_POR_SLUG: Record<string, LandingSeo> = {
  home: {
    path: "/",
    title: "Tiago Fuguete",
    description:
      "Torneios, decks e conteúdos exclusivos de Magic: The Gathering focados no formato Pauper no MTG Online.",
  },
  "sobre-mim": {
    path: "/sobre-mim",
    title: "Sobre mim",
    description:
      "Conheça o Tiago Fuguete — conteúdo, torneios e comunidade de Magic: The Gathering Pauper no MTGO.",
  },
  parceiros: {
    path: "/parceiros",
    title: "Parceiros",
    description: "Parceiros e apoiadores do canal Tiago Fuguete e dos torneios de Pauper.",
  },
  "hall-da-fama": {
    path: "/hall-da-fama",
    title: "Hall da Fama",
    description: "Hall da Fama dos torneios Tiago Fuguete — campeões e Top 8 do Pauper no MTGO.",
  },
  "decks-fuguete": {
    path: "/decks-fuguete",
    title: "Decks do Fuguete",
    description: "Decks públicos do Tiago Fuguete para Pauper no Magic Online.",
  },
  artigos: {
    path: "/artigos",
    title: "Artigos",
    description:
      "Artigos, guias de side e análises de Pauper — conteúdos do Tiago Fuguete e da comunidade.",
  },
  torneios: {
    path: "/torneios",
    title: "Torneios",
    description:
      "Torneios gratuitos de Magic: The Gathering Pauper no MTG Online — inscrições, rodadas, standings e resultados ao vivo.",
  },
};

function resolverLanding(slugRaw: string | undefined): LandingSeo {
  const slug = String(slugRaw || "home").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!slug || slug === "home" || slug === "index") return LANDING_POR_SLUG.home;
  return LANDING_POR_SLUG[slug] || LANDING_POR_SLUG.home;
}

function removerCabecalhosDaApi(response: Response) {
  response.removeHeader("Content-Security-Policy");
  response.removeHeader("X-Frame-Options");
  response.removeHeader("Cross-Origin-Resource-Policy");
  response.removeHeader("Cross-Origin-Opener-Policy");
  response.removeHeader("Origin-Agent-Cluster");
}

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

export function listarSlugsLandingShare(): string[] {
  return Object.keys(LANDING_POR_SLUG);
}

export class RenderizarCompartilhamentoLandingRota implements Rotas {
  private constructor(private readonly caminho: string) {}

  public static criar(caminho = "/site/share/:pagina?") {
    return new RenderizarCompartilhamentoLandingRota(caminho);
  }

  public getCaminho() { return this.caminho; }
  public getMetodo() { return HttpMethod.GET; }
  public getMiddlewares(): RequestHandler[] { return [publicReadRateLimiter]; }

  public getHandler() {
    return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        const forwardedHost = String(request.headers["x-forwarded-host"] || "").split(",")[0].trim().toLowerCase();
        const requestHost = forwardedHost || request.hostname.toLowerCase();
        const amplifyAppId = process.env.AMPLIFY_APP_ID || "d32mjk9mbam2cb";
        const frontendUrl = hostFrontendPermitido(requestHost, amplifyAppId)
          ? `https://${requestHost}`
          : getFrontendUrl();

        const landing = resolverLanding(request.params.pagina as string | undefined);
        const image = `${frontendUrl.replace(/\/+$/, "")}/images/seo/og-default.jpg`;

        removerCabecalhosDaApi(response);
        response.set("Content-Type", "text/html; charset=utf-8");
        response.set("Cache-Control", "private, no-store, must-revalidate");
        response.status(200).send(montarHtmlCompartilhamento({
          canonicalPath: landing.path,
          title: landing.title,
          description: landing.description,
          image,
          imageType: "image/jpeg",
          fallbackDescription: landing.description,
          siteName: "Tiago Fuguete",
        }, HTML_SHELL_COMPARTILHAMENTO, frontendUrl));
      } catch (error) {
        next(error);
      }
    };
  }
}
