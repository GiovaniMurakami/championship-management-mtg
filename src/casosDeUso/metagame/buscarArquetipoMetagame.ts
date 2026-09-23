import { IntervaloDatas, resolverIntervaloDatas } from "../../helpers/data/intervaloDatas";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { ArquetipoDetalhe } from "./agregarMetagame";
import { carregarEAgregarMetagame, MetagameGateways } from "./carregarMetagame";
import { CacheDynamoDbServico, getCacheTtlSegundos } from "../../infra/services/cacheDynamoDbServico";
import { CACHE_PK_METAGAME, cacheSkMetagameArquetipo } from "../../helpers/cache/chavesCache";

export type BuscarArquetipoMetagameInputDto = IntervaloDatas & {
  formato: string;
  slug: string;
  dias?: number;
  limiteListas?: number;
  offsetListas?: number;
};

export type BuscarArquetipoMetagameOutputDto = ArquetipoDetalhe & {
  formato: string;
  dias: number;
  deckIds?: string[];
  paginacaoListas?: {
    total: number;
    limite: number;
    offset: number;
    pagina: number;
    totalPaginas: number;
  };
};

export function limitarListasDoArquetipo(
  detalhe: BuscarArquetipoMetagameOutputDto,
  limite?: number,
  offset = 0
): BuscarArquetipoMetagameOutputDto {
  if (limite == null) return detalhe;
  const total = detalhe.listas.length;
  const offsetSeguro = Math.max(0, offset);
  const horarioPorLista = new Map(
    detalhe.resultados.map((resultado) => [`${resultado.deckId}:${resultado.torneioId}`, resultado.horario])
  );
  const listas = [...detalhe.listas]
    .sort((a, b) => (horarioPorLista.get(`${b.deckId}:${b.torneioId}`) || "").localeCompare(
      horarioPorLista.get(`${a.deckId}:${a.torneioId}`) || ""
    ))
    .slice(offsetSeguro, offsetSeguro + limite);
  return {
    ...detalhe,
    deckIds: detalhe.listas.map((lista) => lista.deckId),
    listas,
    paginacaoListas: {
      total,
      limite,
      offset: offsetSeguro,
      pagina: Math.floor(offsetSeguro / limite) + 1,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
    },
  };
}

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

    const intervalo = resolverIntervaloDatas(input);
    const dias = input.dias ?? 30;
    const cacheKey = cacheSkMetagameArquetipo(input.formato, slug, dias) + (intervalo ? `#de=${input.dataInicio}#ate=${input.dataFim}` : "");
    const versaoCache = await this.cache?.obterVersao(CACHE_PK_METAGAME);
    const cacheado = await this.cache?.buscar<BuscarArquetipoMetagameOutputDto>(CACHE_PK_METAGAME, cacheKey, versaoCache);
    if (cacheado) return limitarListasDoArquetipo(cacheado, input.limiteListas, input.offsetListas);

    const agregado = await carregarEAgregarMetagame(this.gateways, input.formato, dias, intervalo);
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
    await this.cache?.salvar(CACHE_PK_METAGAME, cacheKey, saida, getCacheTtlSegundos("DYNAMODB_CACHE_TTL_METAGAME_SECONDS", 900), versaoCache);
    return limitarListasDoArquetipo(saida, input.limiteListas, input.offsetListas);
  }
}

/** Resposta de navegação: listas completas são buscadas somente na página do deck. */
export function resumirArquetipoMetagame(detalhe: BuscarArquetipoMetagameOutputDto) {
  return {
    ...detalhe,
    listaTipica: undefined,
    listas: detalhe.listas.map((lista) => ({
      deckId: lista.deckId,
      nome: lista.nome,
      nomeConsolidado: lista.nomeConsolidado,
      usuario: lista.usuario,
      torneioId: lista.torneioId,
      torneioNome: lista.torneioNome,
    })),
  };
}
