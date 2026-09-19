import {
  AnuncioDiarioSite,
  AnuncioSite,
  AnunciosSiteConfig,
  SiteConfigGateway,
  TipoAnuncioSite,
} from "../../../dominio/gateway/siteConfigGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

const ANUNCIOS_PK = "SITE_CONFIG";
const ANUNCIOS_SK = "ANUNCIOS";
const ANUNCIO_DIARIO_SK = "ANUNCIO_DIARIO";

type SiteConfigItem = {
  anuncios: AnuncioSite[];
  atualizadoEm?: string;
};

type AnuncioDiarioItem = {
  ativo: boolean;
  imagemUrl: string;
  link: string;
  visualizacoes: number;
  cliques: number;
  atualizadoEm?: string;
};

export class SiteConfigDynamoRepositorio extends BaseDynamoRepositorio implements SiteConfigGateway {
  private constructor() {
    super("site");
  }

  public static criar() {
    return new SiteConfigDynamoRepositorio();
  }

  public async buscarAnuncios(): Promise<AnunciosSiteConfig | null> {
    const item = await this.getJson<SiteConfigItem>(ANUNCIOS_PK, ANUNCIOS_SK);
    if (!item) return null;
    return this.itemParaConfig(item);
  }

  public async salvarAnuncios(config: AnunciosSiteConfig): Promise<AnunciosSiteConfig> {
    const atualizadoEm = config.atualizadoEm ?? new Date();
    const item: SiteConfigItem = {
      anuncios: config.anuncios,
      atualizadoEm: atualizadoEm.toISOString(),
    };
    await this.putJson(ANUNCIOS_PK, ANUNCIOS_SK, item, { entity: "SITE_CONFIG" });
    return this.itemParaConfig(item);
  }

  public async registrarCliqueAnuncio(anuncioId: string): Promise<AnunciosSiteConfig | null> {
    const item = await this.getJson<SiteConfigItem>(ANUNCIOS_PK, ANUNCIOS_SK);
    if (!item) return null;

    let encontrado = false;
    const anuncios = item.anuncios.map((anuncio) => {
      if (anuncio.id !== anuncioId) return anuncio;
      encontrado = true;
      return { ...anuncio, cliques: (anuncio.cliques ?? 0) + 1 };
    });

    if (!encontrado) return null;

    const atualizado: SiteConfigItem = {
      anuncios,
      atualizadoEm: item.atualizadoEm,
    };
    await this.putJson(ANUNCIOS_PK, ANUNCIOS_SK, atualizado, { entity: "SITE_CONFIG" });
    return this.itemParaConfig(atualizado);
  }

  public async buscarAnuncioDiario(): Promise<AnuncioDiarioSite | null> {
    const item = await this.getJson<AnuncioDiarioItem>(ANUNCIOS_PK, ANUNCIO_DIARIO_SK);
    if (!item) return null;
    return this.itemParaAnuncioDiario(item);
  }

  public async salvarAnuncioDiario(config: AnuncioDiarioSite): Promise<AnuncioDiarioSite> {
    const atualizadoEm = config.atualizadoEm ?? new Date();
    const existente = await this.buscarAnuncioDiario();
    const item: AnuncioDiarioItem = {
      ativo: Boolean(config.ativo),
      imagemUrl: config.imagemUrl || "",
      link: config.link || "",
      visualizacoes: existente?.visualizacoes ?? config.visualizacoes ?? 0,
      cliques: existente?.cliques ?? config.cliques ?? 0,
      atualizadoEm: atualizadoEm.toISOString(),
    };
    await this.putJson(ANUNCIOS_PK, ANUNCIO_DIARIO_SK, item, { entity: "SITE_CONFIG" });
    return this.itemParaAnuncioDiario(item);
  }

  public async registrarVisualizacaoAnuncioDiario(): Promise<AnuncioDiarioSite | null> {
    const item = await this.getJson<AnuncioDiarioItem>(ANUNCIOS_PK, ANUNCIO_DIARIO_SK);
    if (!item || !item.ativo || !item.imagemUrl) return null;
    const atualizado: AnuncioDiarioItem = {
      ...item,
      visualizacoes: (item.visualizacoes ?? 0) + 1,
    };
    await this.putJson(ANUNCIOS_PK, ANUNCIO_DIARIO_SK, atualizado, { entity: "SITE_CONFIG" });
    return this.itemParaAnuncioDiario(atualizado);
  }

  public async registrarCliqueAnuncioDiario(): Promise<AnuncioDiarioSite | null> {
    const item = await this.getJson<AnuncioDiarioItem>(ANUNCIOS_PK, ANUNCIO_DIARIO_SK);
    if (!item || !item.ativo || !item.imagemUrl) return null;
    const atualizado: AnuncioDiarioItem = {
      ...item,
      cliques: (item.cliques ?? 0) + 1,
    };
    await this.putJson(ANUNCIOS_PK, ANUNCIO_DIARIO_SK, atualizado, { entity: "SITE_CONFIG" });
    return this.itemParaAnuncioDiario(atualizado);
  }

  private itemParaConfig(item: SiteConfigItem): AnunciosSiteConfig {
    return {
      anuncios: (item.anuncios ?? []).map((anuncio) => ({
        id: anuncio.id,
        tipo: (anuncio.tipo as TipoAnuncioSite) ?? "card",
        tag: anuncio.tag ?? undefined,
        titulo: anuncio.titulo ?? "",
        texto: anuncio.texto ?? undefined,
        imagemUrl: anuncio.imagemUrl ?? undefined,
        link: anuncio.link ?? undefined,
        botaoTexto: anuncio.botaoTexto ?? undefined,
        ativo: anuncio.ativo !== false,
        ordem: anuncio.ordem ?? 0,
        cliques: Number.isFinite(anuncio.cliques) ? Number(anuncio.cliques) : 0,
      })),
      atualizadoEm: item.atualizadoEm ? new Date(item.atualizadoEm) : undefined,
    };
  }

  private itemParaAnuncioDiario(item: AnuncioDiarioItem): AnuncioDiarioSite {
    return {
      ativo: Boolean(item.ativo),
      imagemUrl: item.imagemUrl ?? "",
      link: item.link ?? "",
      visualizacoes: Number.isFinite(item.visualizacoes) ? Number(item.visualizacoes) : 0,
      cliques: Number.isFinite(item.cliques) ? Number(item.cliques) : 0,
      atualizadoEm: item.atualizadoEm ? new Date(item.atualizadoEm) : undefined,
    };
  }
}
