import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { mapearAnunciosSite } from "./mapearAnunciosSite";

type BuscarAnunciosInput = {
  incluirCliques?: boolean;
};

export class BuscarAnuncios {
  private constructor(private readonly siteConfigGateway: SiteConfigGateway) {}

  public static criar(siteConfigGateway: SiteConfigGateway) {
    return new BuscarAnuncios(siteConfigGateway);
  }

  public async executar(input: BuscarAnunciosInput = {}) {
    const config = await this.siteConfigGateway.buscarAnuncios();
    const anuncios = mapearAnunciosSite(
      config?.anuncios ?? [],
      input.incluirCliques === true
    );

    return {
      anuncios,
      atualizadoEm: config?.atualizadoEm ?? null,
    };
  }
}
