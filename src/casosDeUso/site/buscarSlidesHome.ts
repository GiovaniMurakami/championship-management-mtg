import { CacheGateway } from "../../dominio/gateway/cacheGateway";
import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { CACHE_PK_SITE } from "../../helpers/cache/chavesCache";
import { getCacheTtlSegundos } from "../../helpers/cache/ttlCache";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

const CACHE_SK = "home-slides";

export class BuscarSlidesHome {
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheGateway,
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheGateway) {
    return new BuscarSlidesHome(siteConfigGateway, cache);
  }

  public async executar(input: { incluirInativos?: boolean } = {}) {
    const incluirInativos = Boolean(input.incluirInativos);
    const cacheKey = `${CACHE_SK}#admin=${incluirInativos ? "1" : "0"}`;
    const versaoCache = await this.cache?.obterVersao(CACHE_PK_SITE);
    const cacheado = await this.cache?.buscar<{
      slides: unknown[];
      atualizadoEm: string | null;
    }>(CACHE_PK_SITE, cacheKey, versaoCache);
    if (cacheado) return cacheado;

    const config = await this.siteConfigGateway.buscarSlidesHome();
    let slides = [...(config?.slides ?? [])].sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id));
    if (!incluirInativos) {
      slides = slides.filter((s) => s.ativo && s.imagemUrl);
    }

    const saida = {
      slides,
      atualizadoEm: config?.atualizadoEm ? toBrasiliaISO(config.atualizadoEm) : null,
    };
    await this.cache?.salvar(
      CACHE_PK_SITE,
      cacheKey,
      saida,
      getCacheTtlSegundos("DYNAMODB_CACHE_TTL_SITE_SECONDS", 300),
      versaoCache,
    );
    return saida;
  }
}
