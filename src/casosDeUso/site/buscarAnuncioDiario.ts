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
        ativo: false,
        imagemUrl: "",
        link: "",
        ...(input.incluirMetricas ? { visualizacoes: 0, cliques: 0 } : {}),
        atualizadoEm: null,
      };
    }

    const base = {
      ativo: Boolean(config.ativo && config.imagemUrl),
      imagemUrl: config.imagemUrl || "",
      link: config.link || "",
      atualizadoEm: config.atualizadoEm ? config.atualizadoEm.toISOString() : null,
    };

    if (!input.incluirMetricas) return base;

    return {
      ...base,
      ativo: Boolean(config.ativo),
      visualizacoes: config.visualizacoes ?? 0,
      cliques: config.cliques ?? 0,
    };
  }
}
