import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";

type RegistrarCliqueAnuncioInput = {
  anuncioId?: string;
};

export class RegistrarCliqueAnuncio {
  private constructor(private readonly siteConfigGateway: SiteConfigGateway) {}

  public static criar(siteConfigGateway: SiteConfigGateway) {
    return new RegistrarCliqueAnuncio(siteConfigGateway);
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

    return {
      anuncioId,
      cliques: anuncio.cliques ?? 0,
    };
  }
}
