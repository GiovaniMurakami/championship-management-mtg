import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { CacheDynamoDbServico } from "../../infra/services/cacheDynamoDbServico";
import { CACHE_PK_SITE, cacheSkAnunciosSite } from "../../helpers/cache/chavesCache";

type RegistrarCliqueAnuncioInput = {
  anuncioId?: string;
};

export class RegistrarCliqueAnuncio {
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheDynamoDbServico
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheDynamoDbServico) {
    return new RegistrarCliqueAnuncio(siteConfigGateway, cache);
  }

  public async executar(input: RegistrarCliqueAnuncioInput) {
    const anuncioId = typeof input.anuncioId === "string" ? input.anuncioId.trim() : "";

    if (!anuncioId) {
      throw ErroPersonalizado.criar({
        mensagem: "Informe o anuncio para registrar o clique.",
        status: 400,
      });
    }

    const config = await this.siteConfigGateway.registrarCliqueAnuncio(anuncioId);
    const anuncio = config?.anuncios.find((item) => item.id === anuncioId);

    if (!anuncio) {
      throw ErroPersonalizado.criar({
        mensagem: "Anuncio nao encontrado.",
        status: 404,
      });
    }
    await this.cache?.remover(CACHE_PK_SITE, cacheSkAnunciosSite(true));

    return {
      anuncioId,
      cliques: anuncio.cliques ?? 0,
    };
  }
}
