import { v4 as uuidv4 } from "uuid";
import {
  AnuncioDiarioItem,
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

/** UUID estável para migrar o anúncio diário legado (formato single-slot). */
const LEGACY_ANUNCIO_DIARIO_ID = "00000000-0000-4000-8000-000000000001";

type SiteConfigItem = {
  anuncios: AnuncioSite[];
  atualizadoEm?: string;
};

type AnuncioDiarioItemPersistido = {
  id: string;
  imagemUrl: string;
  link: string;
  ativo: boolean;
  ordem: number;
  visualizacoes: number;
  cliques: number;
};

type AnuncioDiarioItemRaw = {
  anuncios?: AnuncioDiarioItemPersistido[];
  /** Formato legado (antes do carrossel). */
  ativo?: boolean;
  imagemUrl?: string;
  link?: string;
  visualizacoes?: number;
  cliques?: number;
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
    const item = await this.getJson<AnuncioDiarioItemRaw>(ANUNCIOS_PK, ANUNCIO_DIARIO_SK);
    if (!item) return null;
    return this.itemParaAnuncioDiario(item);
  }

  public async salvarAnuncioDiario(config: AnuncioDiarioSite): Promise<AnuncioDiarioSite> {
    const atualizadoEm = config.atualizadoEm ?? new Date();
    const item: AnuncioDiarioItemRaw = {
      anuncios: config.anuncios.map((anuncio) => ({
        id: anuncio.id,
        imagemUrl: anuncio.imagemUrl || "",
        link: anuncio.link || "",
        ativo: Boolean(anuncio.ativo),
        ordem: anuncio.ordem ?? 0,
        visualizacoes: anuncio.visualizacoes ?? 0,
        cliques: anuncio.cliques ?? 0,
      })),
      atualizadoEm: atualizadoEm.toISOString(),
    };
    await this.putJson(ANUNCIOS_PK, ANUNCIO_DIARIO_SK, item, { entity: "SITE_CONFIG" });
    return this.itemParaAnuncioDiario(item);
  }

  public async registrarVisualizacaoAnuncioDiario(anuncioId: string): Promise<AnuncioDiarioSite | null> {
    const item = await this.getJson<AnuncioDiarioItemRaw>(ANUNCIOS_PK, ANUNCIO_DIARIO_SK);
    if (!item) return null;
    const config = this.itemParaAnuncioDiario(item);
    const anuncios = config.anuncios.map((anuncio) => {
      if (anuncio.id !== anuncioId || !anuncio.ativo || !anuncio.imagemUrl) return anuncio;
      return { ...anuncio, visualizacoes: anuncio.visualizacoes + 1 };
    });
    if (!anuncios.some((a) => a.id === anuncioId && a.ativo && a.imagemUrl)) return null;

    const atualizado: AnuncioDiarioItemRaw = {
      anuncios: anuncios.map((a) => ({
        id: a.id,
        imagemUrl: a.imagemUrl,
        link: a.link,
        ativo: a.ativo,
        ordem: a.ordem,
        visualizacoes: a.visualizacoes,
        cliques: a.cliques,
      })),
      atualizadoEm: item.atualizadoEm,
    };
    await this.putJson(ANUNCIOS_PK, ANUNCIO_DIARIO_SK, atualizado, { entity: "SITE_CONFIG" });
    return this.itemParaAnuncioDiario(atualizado);
  }

  public async registrarCliqueAnuncioDiario(anuncioId: string): Promise<AnuncioDiarioSite | null> {
    const item = await this.getJson<AnuncioDiarioItemRaw>(ANUNCIOS_PK, ANUNCIO_DIARIO_SK);
    if (!item) return null;
    const config = this.itemParaAnuncioDiario(item);
    const anuncios = config.anuncios.map((anuncio) => {
      if (anuncio.id !== anuncioId || !anuncio.ativo || !anuncio.imagemUrl) return anuncio;
      return { ...anuncio, cliques: anuncio.cliques + 1 };
    });
    if (!anuncios.some((a) => a.id === anuncioId && a.ativo && a.imagemUrl)) return null;

    const atualizado: AnuncioDiarioItemRaw = {
      anuncios: anuncios.map((a) => ({
        id: a.id,
        imagemUrl: a.imagemUrl,
        link: a.link,
        ativo: a.ativo,
        ordem: a.ordem,
        visualizacoes: a.visualizacoes,
        cliques: a.cliques,
      })),
      atualizadoEm: item.atualizadoEm,
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

  private itemParaAnuncioDiario(item: AnuncioDiarioItemRaw): AnuncioDiarioSite {
    const anuncios = this.normalizarAnunciosDiarios(item);
    return {
      anuncios,
      atualizadoEm: item.atualizadoEm ? new Date(item.atualizadoEm) : undefined,
    };
  }

  private normalizarAnunciosDiarios(item: AnuncioDiarioItemRaw): AnuncioDiarioItem[] {
    if (Array.isArray(item.anuncios)) {
      return item.anuncios.map((anuncio, index) => ({
        id: anuncio.id || uuidv4(),
        imagemUrl: anuncio.imagemUrl ?? "",
        link: anuncio.link ?? "",
        ativo: anuncio.ativo !== false,
        ordem: Number.isFinite(anuncio.ordem) ? Number(anuncio.ordem) : index,
        visualizacoes: Number.isFinite(anuncio.visualizacoes) ? Number(anuncio.visualizacoes) : 0,
        cliques: Number.isFinite(anuncio.cliques) ? Number(anuncio.cliques) : 0,
      }));
    }

    // Migração do formato legado (um único anúncio no root).
    if (item.imagemUrl || item.ativo) {
      return [{
        id: LEGACY_ANUNCIO_DIARIO_ID,
        imagemUrl: item.imagemUrl ?? "",
        link: item.link ?? "",
        ativo: Boolean(item.ativo && item.imagemUrl),
        ordem: 0,
        visualizacoes: Number.isFinite(item.visualizacoes) ? Number(item.visualizacoes) : 0,
        cliques: Number.isFinite(item.cliques) ? Number(item.cliques) : 0,
      }];
    }

    return [];
  }
}
