import { v4 as uuidv4 } from "uuid";
import { AnuncioSite, SiteConfigGateway, TipoAnuncioSite } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";

type AnuncioInput = Partial<AnuncioSite>;

type SalvarAnunciosInput = {
  anuncios: AnuncioInput[];
};

const MAX_ANUNCIOS = 20;

const limpar = (valor: unknown, limite: number): string | undefined => {
  if (typeof valor !== "string") return undefined;
  const texto = valor.trim();
  return texto ? texto.slice(0, limite) : undefined;
};

const normalizarTipo = (tipo: unknown): TipoAnuncioSite => (
  tipo === "banner" ? "banner" : "card"
);

export class SalvarAnuncios {
  private constructor(private readonly siteConfigGateway: SiteConfigGateway) {}

  public static criar(siteConfigGateway: SiteConfigGateway) {
    return new SalvarAnuncios(siteConfigGateway);
  }

  public async executar(input: SalvarAnunciosInput) {
    if (!Array.isArray(input.anuncios)) {
      throw ErroPersonalizado.criar({
        mensagem: "Lista de anúncios inválida.",
        status: 400,
      });
    }

    if (input.anuncios.length > MAX_ANUNCIOS) {
      throw ErroPersonalizado.criar({
        mensagem: `Informe no máximo ${MAX_ANUNCIOS} anúncios.`,
        status: 400,
      });
    }

    const anuncios = input.anuncios.map((item, index): AnuncioSite => {
      const tipo = normalizarTipo(item.tipo);
      const titulo = limpar(item.titulo, 180) ?? "";
      const imagemUrl = limpar(item.imagemUrl, 800);

      if (tipo === "banner" && !imagemUrl) {
        throw ErroPersonalizado.criar({
          mensagem: "Anúncio do tipo banner precisa ter imagem.",
          status: 400,
        });
      }

      if (tipo === "card" && !titulo && !imagemUrl) {
        throw ErroPersonalizado.criar({
          mensagem: "Anúncio do tipo card precisa ter título ou imagem.",
          status: 400,
        });
      }

      return {
        id: limpar(item.id, 180) ?? uuidv4(),
        tipo,
        tag: limpar(item.tag, 80),
        titulo,
        texto: limpar(item.texto, 900),
        imagemUrl,
        link: limpar(item.link, 800),
        botaoTexto: limpar(item.botaoTexto, 120),
        ativo: item.ativo !== false,
        ordem: Number.isFinite(item.ordem) ? Number(item.ordem) : index,
      };
    });

    return this.siteConfigGateway.salvarAnuncios({
      anuncios,
      atualizadoEm: new Date(),
    });
  }
}
