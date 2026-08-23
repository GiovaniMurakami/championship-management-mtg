import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { ArquetipoDetalhe } from "./agregarMetagame";
import { carregarEAgregarMetagame, MetagameGateways } from "./carregarMetagame";
import { CacheDynamoDbServico, getCacheTtlSegundos } from "../../infra/services/cacheDynamoDbServico";
import { CACHE_PK_METAGAME, cacheSkMetagameArquetipo } from "../../helpers/cache/chavesCache";

export type BuscarArquetipoMetagameInputDto = {
  formato: string;
  slug: string;
  dias?: number;
};

export type BuscarArquetipoMetagameOutputDto = ArquetipoDetalhe & {
  formato: string;
  dias: number;
};

export class BuscarArquetipoMetagame
  implements CasoDeUso<BuscarArquetipoMetagameInputDto, BuscarArquetipoMetagameOutputDto>
{
  private constructor(
    private readonly gateways: MetagameGateways,
    private readonly cache?: CacheDynamoDbServico
  ) {}

  public static criar(
    torneio: MetagameGateways["torneio"],
    inscricao: MetagameGateways["inscricao"],
    partida: MetagameGateways["partida"],
    deck: MetagameGateways["deck"],
    usuario: MetagameGateways["usuario"],
    cache?: CacheDynamoDbServico
  ) {
    return new BuscarArquetipoMetagame({ torneio, inscricao, partida, deck, usuario }, cache);
  }

  public async executar(
    input: BuscarArquetipoMetagameInputDto
  ): Promise<BuscarArquetipoMetagameOutputDto> {
    const slug = (input.slug || "").trim().toLowerCase();
    if (!slug) {
      throw ErroPersonalizado.criar({
        mensagem: "slug é obrigatório.",
        status: StatusErro.erroParametro,
      });
    }

    const dias = input.dias ?? 30;
    const cacheKey = cacheSkMetagameArquetipo(input.formato, slug, dias);
    const cacheado = await this.cache?.buscar<BuscarArquetipoMetagameOutputDto>(CACHE_PK_METAGAME, cacheKey);
    if (cacheado) return cacheado;

    const agregado = await carregarEAgregarMetagame(this.gateways, input.formato, dias);
    const detalhe = agregado.porSlug.get(slug);
    if (!detalhe) {
      throw ErroPersonalizado.criar({
        mensagem: "Arquétipo não encontrado neste período.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const saida = {
      formato: agregado.formato,
      dias: agregado.dias,
      ...detalhe,
    };
    await this.cache?.salvar(CACHE_PK_METAGAME, cacheKey, saida, getCacheTtlSegundos("DYNAMODB_CACHE_TTL_METAGAME_SECONDS", 900));
    return saida;
  }
}
