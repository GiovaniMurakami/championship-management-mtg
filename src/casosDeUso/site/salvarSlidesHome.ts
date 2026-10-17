import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { CacheGateway } from "../../dominio/gateway/cacheGateway";
import { SiteConfigGateway, SlideHomeSite } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { CACHE_PK_SITE } from "../../helpers/cache/chavesCache";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

const MAX_SLIDES = 12;
const isUuid = (value: string) => z.string().uuid().safeParse(value).success;

const limpar = (valor: unknown, limite: number) => {
  if (typeof valor !== "string") return undefined;
  const texto = valor.trim();
  return texto ? texto.slice(0, limite) : undefined;
};

export class SalvarSlidesHome {
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheGateway,
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheGateway) {
    return new SalvarSlidesHome(siteConfigGateway, cache);
  }

  public async executar(input: { slides?: Partial<SlideHomeSite>[] }) {
    if (!Array.isArray(input.slides)) {
      throw ErroPersonalizado.criar({ mensagem: "Lista de slides inválida.", status: 400 });
    }
    if (input.slides.length > MAX_SLIDES) {
      throw ErroPersonalizado.criar({
        mensagem: `Informe no máximo ${MAX_SLIDES} slides.`,
        status: 400,
      });
    }

    const slides = input.slides.map((item, index): SlideHomeSite => {
      const id = isUuid(String(item.id || "")) ? String(item.id) : uuidv4();
      return {
        id,
        imagemUrl: limpar(item.imagemUrl, 800) || "",
        titulo: limpar(item.titulo, 160) || "",
        texto: limpar(item.texto, 500),
        ctaTexto: limpar(item.ctaTexto, 80),
        ctaUrl: limpar(item.ctaUrl, 800),
        ordem: Number.isFinite(item.ordem) ? Number(item.ordem) : index,
        ativo: item.ativo !== false,
      };
    });

    const salvo = await this.siteConfigGateway.salvarSlidesHome({
      slides,
      atualizadoEm: new Date(),
    });
    await this.cache?.invalidarParticao(CACHE_PK_SITE);

    return {
      slides: salvo.slides,
      atualizadoEm: salvo.atualizadoEm ? toBrasiliaISO(salvo.atualizadoEm) : null,
    };
  }
}
