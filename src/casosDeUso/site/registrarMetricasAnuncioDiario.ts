import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";

export class RegistrarVisualizacaoAnuncioDiario {
  private constructor(private readonly siteConfigGateway: SiteConfigGateway) {}

  public static criar(siteConfigGateway: SiteConfigGateway) {
    return new RegistrarVisualizacaoAnuncioDiario(siteConfigGateway);
  }

  public async executar() {
    const config = await this.siteConfigGateway.registrarVisualizacaoAnuncioDiario();
    if (!config) {
      throw ErroPersonalizado.criar({
        mensagem: "Anúncio diário não encontrado ou inativo.",
        status: 404,
      });
    }
    return { visualizacoes: config.visualizacoes, cliques: config.cliques };
  }
}

export class RegistrarCliqueAnuncioDiario {
  private constructor(private readonly siteConfigGateway: SiteConfigGateway) {}

  public static criar(siteConfigGateway: SiteConfigGateway) {
    return new RegistrarCliqueAnuncioDiario(siteConfigGateway);
  }

  public async executar() {
    const config = await this.siteConfigGateway.registrarCliqueAnuncioDiario();
    if (!config) {
      throw ErroPersonalizado.criar({
        mensagem: "Anúncio diário não encontrado ou inativo.",
        status: 404,
      });
    }
    return { visualizacoes: config.visualizacoes, cliques: config.cliques };
  }
}
