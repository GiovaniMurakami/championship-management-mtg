import {
  AnuncioSite,
  AnunciosSiteConfig,
  SiteConfigGateway,
  TipoAnuncioSite,
} from "../../../dominio/gateway/siteConfigGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

const ANUNCIOS_PK = "SITE_CONFIG";
const ANUNCIOS_SK = "ANUNCIOS";

type SiteConfigItem = {
  anuncios: AnuncioSite[];
  atualizadoEm?: string;
};

export class SiteConfigDynamoRepositorio extends BaseDynamoRepositorio implements SiteConfigGateway {
  private constructor() {
    super();
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
}
