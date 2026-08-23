import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { mapearAnunciosSite } from "./mapearAnunciosSite";
import { CacheDynamoDbServico, getCacheTtlSegundos } from "../../infra/services/cacheDynamoDbServico";
import { CACHE_PK_SITE, cacheSkAnunciosSite } from "../../helpers/cache/chavesCache";

type BuscarAnunciosInput = {
  incluirCliques?: boolean;
};

type BuscarAnunciosOutput = {
  anuncios: ReturnType<typeof mapearAnunciosSite>;
  atualizadoEm: Date | null;
};

export class BuscarAnuncios {
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheDynamoDbServico
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheDynamoDbServico) {
    return new BuscarAnuncios(siteConfigGateway, cache);
  }

  public async executar(input: BuscarAnunciosInput = {}): Promise<BuscarAnunciosOutput> {
    const incluirCliques = input.incluirCliques === true;
    const cacheKey = cacheSkAnunciosSite(incluirCliques);
    const cacheado = await this.cache?.buscar<{ anuncios: ReturnType<typeof mapearAnunciosSite>; atualizadoEm: string | Date | null }>(CACHE_PK_SITE, cacheKey);
    if (cacheado) {
      return {
        anuncios: cacheado.anuncios,
        atualizadoEm: cacheado.atualizadoEm ? new Date(cacheado.atualizadoEm) : null,
      };
    }

    const config = await this.siteConfigGateway.buscarAnuncios();
    const anuncios = mapearAnunciosSite(
      config?.anuncios ?? [],
      incluirCliques
    );

    const saida = {
      anuncios,
      atualizadoEm: config?.atualizadoEm ?? null,
    };
    await this.cache?.salvar(CACHE_PK_SITE, cacheKey, saida, getCacheTtlSegundos("DYNAMODB_CACHE_TTL_SITE_SECONDS", 300));
    return saida;
  }
}
