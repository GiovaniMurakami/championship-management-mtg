import { CacheGateway } from "../../dominio/gateway/cacheGateway";
import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { CACHE_PK_SITE } from "../../helpers/cache/chavesCache";
import { getCacheTtlSegundos } from "../../helpers/cache/ttlCache";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

const CACHE_SK = "parceiros";

export class BuscarParceiros {
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheGateway,
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheGateway) {
    return new BuscarParceiros(siteConfigGateway, cache);
  }

  public async executar(input: { incluirInativos?: boolean } = {}) {
    const incluirInativos = Boolean(input.incluirInativos);
    const cacheKey = `${CACHE_SK}#admin=${incluirInativos ? "1" : "0"}`;
    const versaoCache = await this.cache?.obterVersao(CACHE_PK_SITE);
    const cacheado = await this.cache?.buscar<{
      parceiros: unknown[];
      cupomGlobal: string | null;
      atualizadoEm: string | null;
    }>(CACHE_PK_SITE, cacheKey, versaoCache);
    if (cacheado) return cacheado;

    const config = await this.siteConfigGateway.buscarParceiros();
    let parceiros = [...(config?.parceiros ?? [])].sort(
      (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome),
    );
    if (!incluirInativos) {
      parceiros = parceiros.filter((p) => p.ativo && p.logoUrl);
    }

    const saida = {
      parceiros,
      cupomGlobal: config?.cupomGlobal || null,
      paginaTitulo: config?.paginaTitulo || null,
      paginaTexto: config?.paginaTexto || null,
      ctaTitulo: config?.ctaTitulo || null,
      ctaTexto: config?.ctaTexto || null,
      contatoEmail: config?.contatoEmail || null,
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
