import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { AnuncioSite, SiteConfigGateway, TipoAnuncioSite } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { CacheDynamoDbServico } from "../../infra/services/cacheDynamoDbServico";
import { CACHE_PK_SITE } from "../../helpers/cache/chavesCache";

type AnuncioInput = Partial<AnuncioSite>;

type SalvarAnunciosInput = {
  anuncios: AnuncioInput[];
};

const MAX_ANUNCIOS = 20;

const isUuid = (value: string): boolean => z.string().uuid().safeParse(value).success;

const limpar = (valor: unknown, limite: number): string | undefined => {
  if (typeof valor !== "string") return undefined;
  const texto = valor.trim();
  return texto ? texto.slice(0, limite) : undefined;
};

const normalizarTipo = (tipo: unknown): TipoAnuncioSite => (
  tipo === "banner" ? "banner" : "card"
);

export class SalvarAnuncios {
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheDynamoDbServico
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheDynamoDbServico) {
    return new SalvarAnuncios(siteConfigGateway, cache);
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

    const configAtual = await this.siteConfigGateway.buscarAnuncios();
    const cliquesPorId = new Map(
      (configAtual?.anuncios ?? []).map((anuncio) => [anuncio.id, anuncio.cliques ?? 0])
    );

    const anuncios = input.anuncios.map((item, index): AnuncioSite => {
      const tipo = normalizarTipo(item.tipo);
      const titulo = limpar(item.titulo, 180) ?? "";
      const imagemUrl = limpar(item.imagemUrl, 800);
      const rawId = limpar(item.id, 180);
      const id = rawId && isUuid(rawId) ? rawId : uuidv4();

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
        id,
        tipo,
        tag: limpar(item.tag, 80),
        titulo,
        texto: limpar(item.texto, 900),
        imagemUrl,
        link: limpar(item.link, 800),
        botaoTexto: limpar(item.botaoTexto, 120),
        ativo: item.ativo !== false,
        ordem: Number.isFinite(item.ordem) ? Number(item.ordem) : index,
        cliques: cliquesPorId.get(id) ?? (rawId ? cliquesPorId.get(rawId) : undefined) ?? 0,
      };
    });

    const salvo = await this.siteConfigGateway.salvarAnuncios({
      anuncios,
      atualizadoEm: new Date(),
    });
    await this.cache?.invalidarParticao(CACHE_PK_SITE);
    return salvo;
  }
}
