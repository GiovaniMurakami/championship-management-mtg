import { IntervaloDatas, resolverIntervaloDatas } from "../../helpers/data/intervaloDatas";
import { CasoDeUso } from "../casoDeUso";
import { ArquetipoDetalhe, ArquetipoResumo, RecenteTorneio } from "./agregarMetagame";
import { carregarEAgregarMetagame, MetagameGateways } from "./carregarMetagame";
import { CacheDynamoDbServico, getCacheTtlSegundos } from "../../infra/services/cacheDynamoDbServico";
import { CACHE_PK_METAGAME, cacheSkMetagameLista } from "../../helpers/cache/chavesCache";

export type ListarMetagameInputDto = IntervaloDatas & {
  formato: string;
  dias?: number;
  limite?: number;
  offset?: number;
};

export type ListarMetagameOutputDto = {
  formato: string;
  dias: number;
  totalDecks: number;
  totalTorneios: number;
  arquetipos: (ArquetipoResumo & Pick<ArquetipoDetalhe, "matchups">)[];
  recentes: RecenteTorneio[];
  paginacao?: {
    total: number;
    limite: number;
    offset: number;
  };
};

/** Recorte da resposta já agregada. O cache guarda a lista inteira; a busca seguinte só devolve o restante. */
export function recortarArquetiposMetagame(
  saida: ListarMetagameOutputDto,
  limite?: number,
  offset = 0,
): ListarMetagameOutputDto {
  if (limite == null && offset === 0) return saida;
  const offsetSeguro = Math.max(0, offset);
  const total = saida.arquetipos.length;
  const fim = limite == null ? total : offsetSeguro + limite;
  return {
    ...saida,
    arquetipos: saida.arquetipos.slice(offsetSeguro, fim),
    recentes: offsetSeguro > 0 ? [] : saida.recentes,
    paginacao: {
      total,
      limite: Math.max(0, (limite == null ? total : fim) - offsetSeguro),
      offset: offsetSeguro,
    },
  };
}

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
    cache?: CacheDynamoDbServico,
    siteConfig?: MetagameGateways["siteConfig"]
  ) {
    return new ListarMetagame({ torneio, inscricao, partida, deck, usuario, siteConfig }, cache);
  }

  public async executar(input: ListarMetagameInputDto): Promise<ListarMetagameOutputDto> {
    const intervalo = resolverIntervaloDatas(input);
    const dias = input.dias ?? 30;
    const cacheKey = cacheSkMetagameLista(input.formato, dias) + (intervalo ? `#de=${input.dataInicio}#ate=${input.dataFim}` : "");
    const versaoCache = await this.cache?.obterVersao(CACHE_PK_METAGAME);
    const cacheado = await this.cache?.buscar<ListarMetagameOutputDto>(CACHE_PK_METAGAME, cacheKey, versaoCache);
    if (cacheado) return recortarArquetiposMetagame(cacheado, input.limite, input.offset);

    const agregado = await carregarEAgregarMetagame(this.gateways, input.formato, dias, intervalo);
    const saida = {
      formato: agregado.formato,
      dias: agregado.dias,
      totalDecks: agregado.totalDecks,
      totalTorneios: agregado.totalTorneios,
      arquetipos: agregado.arquetipos.map(arquetipo => ({
        ...arquetipo,
        matchups: agregado.porSlug.get(arquetipo.slug)?.matchups ?? [],
      })),
      recentes: agregado.recentes,
    };
    await this.cache?.salvar(CACHE_PK_METAGAME, cacheKey, saida, getCacheTtlSegundos("DYNAMODB_CACHE_TTL_METAGAME_SECONDS", 900), versaoCache);
    return recortarArquetiposMetagame(saida, input.limite, input.offset);
  }
}
