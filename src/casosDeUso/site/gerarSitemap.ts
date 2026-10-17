import { ArtigoGateway } from "../../dominio/gateway/artigoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { getFrontendUrl } from "../../helpers/env";
import { CasoDeUso } from "../casoDeUso";

export type SitemapUrlEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
};

export type GerarSitemapOutputDto = {
  urls: SitemapUrlEntry[];
  baseUrl: string;
};

const PAGINA_TORNEIOS = 100;
const MAX_TORNEIOS_SITEMAP = 5000;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/gi, "c")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function absoluteUrl(base: string, path: string): string {
  const root = base.replace(/\/+$/, "");
  if (!path || path === "/") return `${root}/`;
  return `${root}${path.startsWith("/") ? path : `/${path}`}`;
}

function toLastmod(date: Date | string | undefined | null): string | undefined {
  if (!date) return undefined;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

const PAGINAS_ESTATICAS: Array<{ path: string; changefreq: SitemapUrlEntry["changefreq"]; priority: string }> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/torneios", changefreq: "hourly", priority: "0.9" },
  { path: "/artigos", changefreq: "daily", priority: "0.9" },
  { path: "/hall-da-fama", changefreq: "weekly", priority: "0.8" },
  { path: "/decks-fuguete", changefreq: "weekly", priority: "0.7" },
  { path: "/sobre-mim", changefreq: "monthly", priority: "0.6" },
  { path: "/parceiros", changefreq: "monthly", priority: "0.6" },
  { path: "/metagame", changefreq: "daily", priority: "0.7" },
  { path: "/termos-de-uso", changefreq: "yearly", priority: "0.2" },
  { path: "/privacidade", changefreq: "yearly", priority: "0.2" },
];

export class GerarSitemap implements CasoDeUso<void, GerarSitemapOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly artigoGateway: ArtigoGateway,
  ) {}

  public static criar(torneioGateway: TorneioGateway, artigoGateway: ArtigoGateway) {
    return new GerarSitemap(torneioGateway, artigoGateway);
  }

  public async executar(): Promise<GerarSitemapOutputDto> {
    const baseUrl = getFrontendUrl().replace(/\/+$/, "");
    const urls: SitemapUrlEntry[] = PAGINAS_ESTATICAS.map((p) => ({
      loc: absoluteUrl(baseUrl, p.path),
      changefreq: p.changefreq,
      priority: p.priority,
    }));

    let offset = 0;
    while (offset < MAX_TORNEIOS_SITEMAP) {
      const lote = await this.torneioGateway.listar({
        limite: PAGINA_TORNEIOS,
        offset,
        incluirSecretos: false,
        horarioDesc: true,
      });
      if (lote.length === 0) break;

      for (const torneio of lote) {
        if (torneio.secreto) continue;
        const slug = slugify(torneio.nome || "torneio") || "torneio";
        urls.push({
          loc: absoluteUrl(baseUrl, `/torneios/${torneio.id.slice(0, 5)}-${slug}`),
          lastmod: toLastmod(torneio.criadoEm),
          changefreq: torneio.status === "finalizado" ? "monthly" : "hourly",
          priority: torneio.status === "finalizado" ? "0.5" : "0.8",
        });
      }

      offset += lote.length;
      if (lote.length < PAGINA_TORNEIOS) break;
    }

    const artigos = await this.artigoGateway.listar({ status: ["publicado", "pendente_edicao"] });
    for (const artigo of artigos) {
      const slug = slugify(artigo.titulo || "artigo") || "artigo";
      urls.push({
        loc: absoluteUrl(baseUrl, `/artigos/${artigo.id.slice(0, 5)}-${slug}`),
        lastmod: toLastmod(artigo.atualizadoEm || artigo.publicadoEm || artigo.criadoEm),
        changefreq: "weekly",
        priority: "0.7",
      });
    }

    return { urls, baseUrl };
  }
}

export function montarXmlSitemap(urls: SitemapUrlEntry[]): string {
  const linhas = urls.map((u) => {
    const parts = [`    <loc>${escapeXml(u.loc)}</loc>`];
    if (u.lastmod) parts.push(`    <lastmod>${escapeXml(u.lastmod)}</lastmod>`);
    if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
    if (u.priority) parts.push(`    <priority>${u.priority}</priority>`);
    return `  <url>\n${parts.join("\n")}\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${linhas.join("\n")}
</urlset>
`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
