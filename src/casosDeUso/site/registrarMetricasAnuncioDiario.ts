import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";

export class RegistrarVisualizacaoAnuncioDiario {
  private constructor(private readonly siteConfigGateway: SiteConfigGateway) {}

  public static criar(siteConfigGateway: SiteConfigGateway) {
    return new RegistrarVisualizacaoAnuncioDiario(siteConfigGateway);
  }

  public async executar(input: { anuncioId: string }) {
    const config = await this.siteConfigGateway.registrarVisualizacaoAnuncioDiario(input.anuncioId);
    if (!config) {
      throw ErroPersonalizado.criar({
        mensagem: "Anúncio diário não encontrado ou inativo.",
        status: 404,
      });
    }
    const anuncio = config.anuncios.find((a) => a.id === input.anuncioId);
    return {
      anuncioId: input.anuncioId,
      visualizacoes: anuncio?.visualizacoes ?? 0,
      cliques: anuncio?.cliques ?? 0,
    };
  }
}

export class RegistrarCliqueAnuncioDiario {
  private constructor(private readonly siteConfigGateway: SiteConfigGateway) {}

  public static criar(siteConfigGateway: SiteConfigGateway) {
    return new RegistrarCliqueAnuncioDiario(siteConfigGateway);
  }

  public async executar(input: { anuncioId: string }) {
    const config = await this.siteConfigGateway.registrarCliqueAnuncioDiario(input.anuncioId);
    if (!config) {
      throw ErroPersonalizado.criar({
        mensagem: "Anúncio diário não encontrado ou inativo.",
        status: 404,
      });
    }
    const anuncio = config.anuncios.find((a) => a.id === input.anuncioId);
    return {
      anuncioId: input.anuncioId,
      visualizacoes: anuncio?.visualizacoes ?? 0,
      cliques: anuncio?.cliques ?? 0,
    };
  }
}
