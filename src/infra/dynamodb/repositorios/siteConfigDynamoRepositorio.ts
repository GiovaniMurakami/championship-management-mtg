import { v4 as uuidv4 } from "uuid";
import {
  AnuncioDiarioItem,
  AnuncioDiarioSite,
  AnuncioSite,
  AnunciosSiteConfig,
  ConteudoHomeConfig,
  MetagameOverridesConfig,
  ParceiroSite,
  ParceirosSiteConfig,
  SiteConfigGateway,
  SlideHomeSite,
  SlidesHomeConfig,
  SobreMimConfig,
  TipoAnuncioSite,
} from "../../../dominio/gateway/siteConfigGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

const ANUNCIOS_PK = "SITE_CONFIG";
const ANUNCIOS_SK = "ANUNCIOS";
const ANUNCIO_DIARIO_SK = "ANUNCIO_DIARIO";
const METAGAME_OVERRIDES_SK = "METAGAME_OVERRIDES";
const SLIDES_HOME_SK = "HOME_SLIDES";
const PARCEIROS_SK = "PARCEIROS";
const CONTEUDO_HOME_SK = "HOME_CONTEUDO";
const SOBRE_MIM_SK = "SOBRE_MIM";

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

type SobreMimPersistido = {
  tituloHistoria?: string;
  historia?: string;
  fotoUrl?: string;
  apoiaTitulo?: string;
  apoiaTexto?: string;
  apoiaImagemUrl?: string;
  apoiaUrl?: string;
  galeriaTitulo?: string;
  galeriaUrls?: string[];
  agradecimentoTitulo?: string;
  agradecimentoTexto?: string;
  apoiadores?: string;
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

  public async buscarMetagameOverrides(): Promise<MetagameOverridesConfig | null> {
    const item = await this.getJson<{ cartasRepresentativas?: Record<string, string>; atualizadoEm?: string }>(
      ANUNCIOS_PK,
      METAGAME_OVERRIDES_SK
    );
    if (!item) return null;
    return this.itemParaMetagameOverrides(item);
  }

  public async salvarMetagameOverrides(config: MetagameOverridesConfig): Promise<MetagameOverridesConfig> {
    const atualizadoEm = config.atualizadoEm ?? new Date();
    const cartasRepresentativas: Record<string, string> = {};
    for (const [chave, valor] of Object.entries(config.cartasRepresentativas ?? {})) {
      const carta = String(valor ?? "").trim();
      if (!chave.trim() || !carta) continue;
      cartasRepresentativas[chave.trim()] = carta;
    }
    const item = {
      cartasRepresentativas,
      atualizadoEm: atualizadoEm.toISOString(),
    };
    await this.putJson(ANUNCIOS_PK, METAGAME_OVERRIDES_SK, item, { entity: "SITE_CONFIG" });
    return this.itemParaMetagameOverrides(item);
  }

  public async buscarSlidesHome(): Promise<SlidesHomeConfig | null> {
    const item = await this.getJson<{ slides?: SlideHomeSite[]; atualizadoEm?: string }>(
      ANUNCIOS_PK,
      SLIDES_HOME_SK,
    );
    if (!item) return null;
    return this.itemParaSlidesHome(item);
  }

  public async salvarSlidesHome(config: SlidesHomeConfig): Promise<SlidesHomeConfig> {
    const atualizadoEm = config.atualizadoEm ?? new Date();
    const item = {
      slides: config.slides,
      atualizadoEm: atualizadoEm.toISOString(),
    };
    await this.putJson(ANUNCIOS_PK, SLIDES_HOME_SK, item, { entity: "SITE_CONFIG" });
    return this.itemParaSlidesHome(item);
  }

  public async buscarParceiros(): Promise<ParceirosSiteConfig | null> {
    const item = await this.getJson<{
      parceiros?: ParceiroSite[];
      cupomGlobal?: string;
      paginaTitulo?: string;
      paginaTexto?: string;
      ctaTitulo?: string;
      ctaTexto?: string;
      contatoEmail?: string;
      atualizadoEm?: string;
    }>(ANUNCIOS_PK, PARCEIROS_SK);
    if (!item) return null;
    return this.itemParaParceiros(item);
  }

  public async salvarParceiros(config: ParceirosSiteConfig): Promise<ParceirosSiteConfig> {
    const atualizadoEm = config.atualizadoEm ?? new Date();
    const item = {
      parceiros: config.parceiros,
      cupomGlobal: config.cupomGlobal || undefined,
      paginaTitulo: config.paginaTitulo || undefined,
      paginaTexto: config.paginaTexto || undefined,
      ctaTitulo: config.ctaTitulo || undefined,
      ctaTexto: config.ctaTexto || undefined,
      contatoEmail: config.contatoEmail || undefined,
      atualizadoEm: atualizadoEm.toISOString(),
    };
    await this.putJson(ANUNCIOS_PK, PARCEIROS_SK, item, { entity: "SITE_CONFIG" });
    return this.itemParaParceiros(item);
  }

  public async buscarSobreMim(): Promise<SobreMimConfig | null> {
    const item = await this.getJson<SobreMimPersistido>(ANUNCIOS_PK, SOBRE_MIM_SK);
    if (!item) return null;
    return this.itemParaSobreMim(item);
  }

  public async salvarSobreMim(config: SobreMimConfig): Promise<SobreMimConfig> {
    const atualizadoEm = config.atualizadoEm ?? new Date();
    const item: SobreMimPersistido = {
      tituloHistoria: config.tituloHistoria,
      historia: config.historia,
      fotoUrl: config.fotoUrl,
      apoiaTitulo: config.apoiaTitulo,
      apoiaTexto: config.apoiaTexto,
      apoiaImagemUrl: config.apoiaImagemUrl,
      apoiaUrl: config.apoiaUrl,
      galeriaTitulo: config.galeriaTitulo,
      galeriaUrls: config.galeriaUrls,
      agradecimentoTitulo: config.agradecimentoTitulo,
      agradecimentoTexto: config.agradecimentoTexto,
      apoiadores: config.apoiadores,
      atualizadoEm: atualizadoEm.toISOString(),
    };
    await this.putJson(ANUNCIOS_PK, SOBRE_MIM_SK, item, { entity: "SITE_CONFIG" });
    return this.itemParaSobreMim(item);
  }

  public async buscarConteudoHome(): Promise<ConteudoHomeConfig | null> {
    const item = await this.getJson<{
      youtube?: { titulo?: string; texto?: string };
      twitch?: { titulo?: string; texto?: string };
      artigos?: { titulo?: string; texto?: string };
      parceiros?: { titulo?: string; texto?: string };
      fugueteUsuarioId?: string;
      atualizadoEm?: string;
    }>(ANUNCIOS_PK, CONTEUDO_HOME_SK);
    if (!item) return null;
    return this.itemParaConteudoHome(item);
  }

  public async salvarConteudoHome(config: ConteudoHomeConfig): Promise<ConteudoHomeConfig> {
    const atualizadoEm = config.atualizadoEm ?? new Date();
    const item = {
      youtube: config.youtube,
      twitch: config.twitch,
      artigos: config.artigos,
      parceiros: config.parceiros,
      fugueteUsuarioId: config.fugueteUsuarioId || undefined,
      atualizadoEm: atualizadoEm.toISOString(),
    };
    await this.putJson(ANUNCIOS_PK, CONTEUDO_HOME_SK, item, { entity: "SITE_CONFIG" });
    return this.itemParaConteudoHome(item);
  }

  private itemParaSlidesHome(item: {
    slides?: SlideHomeSite[];
    atualizadoEm?: string;
  }): SlidesHomeConfig {
    return {
      slides: (item.slides ?? []).map((slide, index) => ({
        id: slide.id || uuidv4(),
        imagemUrl: slide.imagemUrl ?? "",
        titulo: slide.titulo ?? "",
        texto: slide.texto || undefined,
        ctaTexto: slide.ctaTexto || undefined,
        ctaUrl: slide.ctaUrl || undefined,
        ordem: Number.isFinite(slide.ordem) ? Number(slide.ordem) : index,
        ativo: slide.ativo !== false,
      })),
      atualizadoEm: item.atualizadoEm ? new Date(item.atualizadoEm) : undefined,
    };
  }

  private itemParaConteudoHome(item: {
    youtube?: { titulo?: string; texto?: string };
    twitch?: { titulo?: string; texto?: string };
    artigos?: { titulo?: string; texto?: string };
    parceiros?: { titulo?: string; texto?: string };
    fugueteUsuarioId?: string;
    atualizadoEm?: string;
  }): ConteudoHomeConfig {
    const secao = (valor?: { titulo?: string; texto?: string }) => ({
      titulo: valor?.titulo ?? "",
      texto: valor?.texto ?? "",
    });
    return {
      youtube: secao(item.youtube),
      twitch: secao(item.twitch),
      artigos: secao(item.artigos),
      parceiros: secao(item.parceiros),
      fugueteUsuarioId: item.fugueteUsuarioId || undefined,
      atualizadoEm: item.atualizadoEm ? new Date(item.atualizadoEm) : undefined,
    };
  }

  private itemParaParceiros(item: {
    parceiros?: ParceiroSite[];
    cupomGlobal?: string;
    paginaTitulo?: string;
    paginaTexto?: string;
    ctaTitulo?: string;
    ctaTexto?: string;
    contatoEmail?: string;
    atualizadoEm?: string;
  }): ParceirosSiteConfig {
    return {
      parceiros: (item.parceiros ?? []).map((parceiro, index) => ({
        id: parceiro.id || uuidv4(),
        nome: parceiro.nome ?? "",
        logoUrl: parceiro.logoUrl ?? "",
        linkUrl: parceiro.linkUrl ?? "",
        cupom: parceiro.cupom || undefined,
        ordem: Number.isFinite(parceiro.ordem) ? Number(parceiro.ordem) : index,
        ativo: parceiro.ativo !== false,
      })),
      cupomGlobal: item.cupomGlobal || undefined,
      paginaTitulo: item.paginaTitulo || undefined,
      paginaTexto: item.paginaTexto || undefined,
      ctaTitulo: item.ctaTitulo || undefined,
      ctaTexto: item.ctaTexto || undefined,
      contatoEmail: item.contatoEmail || undefined,
      atualizadoEm: item.atualizadoEm ? new Date(item.atualizadoEm) : undefined,
    };
  }

  private itemParaSobreMim(item: SobreMimPersistido): SobreMimConfig {
    return {
      tituloHistoria: item.tituloHistoria ?? "",
      historia: item.historia ?? "",
      fotoUrl: item.fotoUrl ?? "",
      apoiaTitulo: item.apoiaTitulo ?? "",
      apoiaTexto: item.apoiaTexto ?? "",
      apoiaImagemUrl: item.apoiaImagemUrl ?? "",
      apoiaUrl: item.apoiaUrl ?? "",
      galeriaTitulo: item.galeriaTitulo ?? "",
      galeriaUrls: Array.isArray(item.galeriaUrls) ? item.galeriaUrls.filter(Boolean) : [],
      agradecimentoTitulo: item.agradecimentoTitulo ?? "",
      agradecimentoTexto: item.agradecimentoTexto ?? "",
      apoiadores: item.apoiadores ?? "",
      atualizadoEm: item.atualizadoEm ? new Date(item.atualizadoEm) : undefined,
    };
  }

  private itemParaMetagameOverrides(item: {
    cartasRepresentativas?: Record<string, string>;
    atualizadoEm?: string;
  }): MetagameOverridesConfig {
    const cartasRepresentativas: Record<string, string> = {};
    for (const [chave, valor] of Object.entries(item.cartasRepresentativas ?? {})) {
      const carta = String(valor ?? "").trim();
      if (!chave.trim() || !carta) continue;
      cartasRepresentativas[chave.trim()] = carta;
    }
    return {
      cartasRepresentativas,
      atualizadoEm: item.atualizadoEm ? new Date(item.atualizadoEm) : undefined,
    };
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
