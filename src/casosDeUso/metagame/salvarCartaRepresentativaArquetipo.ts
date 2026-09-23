import { SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { normalizarFormatoDeck } from "../../dominio/regras/formatoDeck";
import { CACHE_PK_METAGAME } from "../../helpers/cache/chavesCache";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { CacheDynamoDbServico } from "../../infra/services/cacheDynamoDbServico";
import { CasoDeUso } from "../casoDeUso";
import { chaveCartaRepresentativaMetagame } from "./agregarMetagame";

export type SalvarCartaRepresentativaArquetipoInputDto = {
  formato: string;
  slug: string;
  cartaRepresentativa?: string | null;
};

export type SalvarCartaRepresentativaArquetipoOutputDto = {
  formato: string;
  slug: string;
  cartaRepresentativa: string | null;
};

export class SalvarCartaRepresentativaArquetipo
  implements CasoDeUso<SalvarCartaRepresentativaArquetipoInputDto, SalvarCartaRepresentativaArquetipoOutputDto>
{
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheDynamoDbServico
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheDynamoDbServico) {
    return new SalvarCartaRepresentativaArquetipo(siteConfigGateway, cache);
  }

  public async executar(
    input: SalvarCartaRepresentativaArquetipoInputDto
  ): Promise<SalvarCartaRepresentativaArquetipoOutputDto> {
    const formato = normalizarFormatoDeck(input.formato || "");
    if (!formato) {
      throw ErroPersonalizado.criar({
        mensagem: "Formato é obrigatório.",
        status: StatusErro.erroParametro,
      });
    }

    const slug = (input.slug || "").trim().toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      throw ErroPersonalizado.criar({
        mensagem: "slug inválido.",
        status: StatusErro.erroParametro,
      });
    }

    const carta =
      input.cartaRepresentativa == null
        ? null
        : String(input.cartaRepresentativa).trim() || null;

    if (carta && carta.length > 200) {
      throw ErroPersonalizado.criar({
        mensagem: "cartaRepresentativa deve ter no máximo 200 caracteres.",
        status: StatusErro.erroParametro,
      });
    }

    const atual = (await this.siteConfigGateway.buscarMetagameOverrides()) ?? {
      cartasRepresentativas: {},
    };
    const cartasRepresentativas = { ...atual.cartasRepresentativas };
    const chave = chaveCartaRepresentativaMetagame(formato, slug);

    if (carta) {
      cartasRepresentativas[chave] = carta;
    } else {
      delete cartasRepresentativas[chave];
    }

    await this.siteConfigGateway.salvarMetagameOverrides({
      cartasRepresentativas,
      atualizadoEm: new Date(),
    });
    await this.cache?.invalidarParticao(CACHE_PK_METAGAME);

    return { formato, slug, cartaRepresentativa: carta };
  }
}
