import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";

export class BuscarAnuncioDiario {
  private constructor(private readonly siteConfigGateway: SiteConfigGateway) {}

  public static criar(siteConfigGateway: SiteConfigGateway) {
    return new BuscarAnuncioDiario(siteConfigGateway);
  }

  public async executar(input: { incluirMetricas?: boolean } = {}) {
    const config = await this.siteConfigGateway.buscarAnuncioDiario();
    if (!config) {
      return {
        anuncios: [],
        atualizadoEm: null,
      };
    }

    const anunciosOrdenados = [...config.anuncios].sort(
      (a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id)
    );

    if (!input.incluirMetricas) {
      return {
        anuncios: anunciosOrdenados
          .filter((a) => a.ativo && a.imagemUrl)
          .map((a) => ({
            id: a.id,
            imagemUrl: a.imagemUrl,
            link: a.link || "",
            ordem: a.ordem,
          })),
        atualizadoEm: config.atualizadoEm ? config.atualizadoEm.toISOString() : null,
      };
    }

    return {
      anuncios: anunciosOrdenados.map((a) => ({
        id: a.id,
        imagemUrl: a.imagemUrl,
        link: a.link || "",
        ativo: a.ativo,
        ordem: a.ordem,
        visualizacoes: a.visualizacoes ?? 0,
        cliques: a.cliques ?? 0,
      })),
      atualizadoEm: config.atualizadoEm ? config.atualizadoEm.toISOString() : null,
    };
  }
}
