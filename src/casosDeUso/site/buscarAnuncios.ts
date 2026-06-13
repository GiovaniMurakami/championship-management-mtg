import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";

export class BuscarAnuncios {
  private constructor(private readonly siteConfigGateway: SiteConfigGateway) {}

  public static criar(siteConfigGateway: SiteConfigGateway) {
    return new BuscarAnuncios(siteConfigGateway);
  }

  public async executar() {
    const config = await this.siteConfigGateway.buscarAnuncios();

    return {
      anuncios: config?.anuncios ?? [],
      atualizadoEm: config?.atualizadoEm ?? null,
    };
  }
}
