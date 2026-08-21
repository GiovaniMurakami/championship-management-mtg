import { CasoDeUso } from "../casoDeUso";
import { ArquetipoResumo, RecenteTorneio } from "./agregarMetagame";
import { carregarEAgregarMetagame, MetagameGateways } from "./carregarMetagame";
import { CacheDynamoDbServico, getCacheTtlSegundos } from "../../infra/services/cacheDynamoDbServico";
import { CACHE_PK_METAGAME, cacheSkMetagameLista } from "../../helpers/cache/chavesCache";

export type ListarMetagameInputDto = {
  formato: string;
  dias?: number;
};

export type ListarMetagameOutputDto = {
  formato: string;
  dias: number;
  totalDecks: number;
  totalTorneios: number;
  arquetipos: ArquetipoResumo[];
  recentes: RecenteTorneio[];
};

export class ListarMetagame implements CasoDeUso<ListarMetagameInputDto, ListarMetagameOutputDto> {
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
    return new ListarMetagame({ torneio, inscricao, partida, deck, usuario }, cache);
  }

  public async executar(input: ListarMetagameInputDto): Promise<ListarMetagameOutputDto> {
    const dias = input.dias ?? 30;
    const cacheKey = cacheSkMetagameLista(input.formato, dias);
    const cacheado = await this.cache?.buscar<ListarMetagameOutputDto>(CACHE_PK_METAGAME, cacheKey);
    if (cacheado) return cacheado;

    const agregado = await carregarEAgregarMetagame(this.gateways, input.formato, dias);
    const saida = {
      formato: agregado.formato,
      dias: agregado.dias,
      totalDecks: agregado.totalDecks,
      totalTorneios: agregado.totalTorneios,
      arquetipos: agregado.arquetipos,
      recentes: agregado.recentes,
    };
    await this.cache?.salvar(CACHE_PK_METAGAME, cacheKey, saida, getCacheTtlSegundos("DYNAMODB_CACHE_TTL_METAGAME_SECONDS", 900));
    return saida;
  }
}
