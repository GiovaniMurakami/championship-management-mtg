import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";

export class SalvarAnuncioDiario {
  private constructor(private readonly siteConfigGateway: SiteConfigGateway) {}

  public static criar(siteConfigGateway: SiteConfigGateway) {
    return new SalvarAnuncioDiario(siteConfigGateway);
  }

  public async executar(input: { ativo?: boolean; imagemUrl?: string; link?: string }) {
    const imagemUrl = String(input.imagemUrl ?? "").trim();
    const link = String(input.link ?? "").trim();
    const ativo = Boolean(input.ativo);

    if (ativo && !imagemUrl) {
      throw ErroPersonalizado.criar({
        mensagem: "Informe a imagem do anúncio diário para ativá-lo.",
        status: 400,
      });
    }

    const salvo = await this.siteConfigGateway.salvarAnuncioDiario({
      ativo,
      imagemUrl,
      link,
      visualizacoes: 0,
      cliques: 0,
      atualizadoEm: new Date(),
    });

    return {
      ativo: salvo.ativo,
      imagemUrl: salvo.imagemUrl,
      link: salvo.link,
      visualizacoes: salvo.visualizacoes,
      cliques: salvo.cliques,
      atualizadoEm: salvo.atualizadoEm ? salvo.atualizadoEm.toISOString() : null,
    };
  }
}
