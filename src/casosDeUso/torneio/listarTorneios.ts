import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { StatusTorneio } from "../../dominio/entidade/torneio";
import { CasoDeUso } from "../casoDeUso";
import { normalizarPaginacaoOffset } from "../../helpers/paginacao";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { CacheDynamoDbServico, getCacheTtlSegundos } from "../../infra/services/cacheDynamoDbServico";
import { CACHE_PK_TORNEIOS, cacheSkListarTorneios } from "../../helpers/cache/chavesCache";

const LIMITE_MAXIMO_TORNEIOS = 100;
const LIMITE_PADRAO_TORNEIOS = 20;

export type ListarTorneiosInputDto = {
  /** Ausente para visitante sem login — todos os torneios saem com inscrito=false. */
  usuarioId?: string;
  limite?: number;
  offset?: number;
  status?: StatusTorneio;
  nome?: string;
  dataInicio?: Date;
  dataFim?: Date;
};

export type ListarTorneiosOutputDto = {
  torneios: Array<{
    id: string;
    nome: string;
    horario: string;
    formato: string;
    donoId: string;
    status: string;
    rodadaAtual: number;
    totalRodadas: number;
    descricao?: string;
    regras?: string;
    bannerUrl?: string;
    linkBanner?: string;
    somRodada?: string;
    storyFundoUrl?: string;
    storyFundoTextoRodape?: "claro" | "escuro";
    maxJogadores?: number;
    maxRodadas?: number;
    corteTop?: number;
    linkLive?: string;
    exibirNomeJogador?: string;
    emCorte: boolean;
    secreto: boolean;
    visualizacoes: number;
    criadoEm: string;
    inscrito: boolean;
    totalInscritos: number;
  }>;
  total: number;
  limite: number;
  offset: number;
};

export class ListarTorneios
  implements CasoDeUso<ListarTorneiosInputDto, ListarTorneiosOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly cache?: CacheDynamoDbServico
  ) { }

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    cache?: CacheDynamoDbServico
  ) {
    return new ListarTorneios(torneioGateway, inscricaoGateway, cache);
  }

  public async executar({
    usuarioId,
    limite,
    offset,
    status,
    nome,
    dataInicio,
    dataFim,
  }: ListarTorneiosInputDto): Promise<ListarTorneiosOutputDto> {
    const paginacao = normalizarPaginacaoOffset(
      limite,
      offset,
      LIMITE_PADRAO_TORNEIOS,
      LIMITE_MAXIMO_TORNEIOS
    );
    const cacheKey = cacheSkListarTorneios({
      usuarioId: usuarioId ?? null,
      limite: paginacao.limite,
      offset: paginacao.offset,
      status: status ?? null,
      nome: nome ?? null,
      dataInicio: dataInicio?.toISOString() ?? null,
      dataFim: dataFim?.toISOString() ?? null,
    });
    const cacheado = await this.cache?.buscar<ListarTorneiosOutputDto>(CACHE_PK_TORNEIOS, cacheKey);
    if (cacheado) return cacheado;

    const [torneios, total, inscricoes] = await Promise.all([
      this.torneioGateway.listar({
        limite: paginacao.limite,
        offset: paginacao.offset,
        incluirSecretos: false,
        status,
        nome,
        dataInicio,
        dataFim,
        horarioDesc: status === "finalizado",
      }),
      this.torneioGateway.listarTotal({ incluirSecretos: false, status, nome, dataInicio, dataFim }),
      usuarioId ? this.inscricaoGateway.listarPorUsuario(usuarioId) : Promise.resolve([]),
    ]);

    const torneiosInscritos = new Set(inscricoes.map((i) => i.torneioId));
    const torneioIds = torneios.map((t) => t.id);
    const contagemInscritos = torneioIds.length > 0
      ? await this.inscricaoGateway.contarPorTorneios(torneioIds)
      : {};

    const saida = {
      torneios: torneios.map((t) => ({
        id: t.id,
        nome: t.nome,
        horario: toBrasiliaISO(t.horario)!,
        formato: t.formato,
        donoId: t.donoId,
        status: t.status,
        rodadaAtual: t.rodadaAtual,
        totalRodadas: t.totalRodadas,
        descricao: t.descricao,
        regras: t.regras,
        bannerUrl: t.bannerUrl,
        linkBanner: t.linkBanner,
        somRodada: t.somRodada,
        storyFundoUrl: t.storyFundoUrl,
        storyFundoTextoRodape: t.storyFundoTextoRodape,
        maxJogadores: t.maxJogadores,
        maxRodadas: t.maxRodadas,
        corteTop: t.corteTop,
        linkLive: t.linkLive,
        emCorte: t.emCorte,
        secreto: t.secreto,
        exibirNomeJogador: t.exibirNomeJogador,
        visualizacoes: t.visualizacoes,
        criadoEm: toBrasiliaISO(t.criadoEm)!,
        inscrito: torneiosInscritos.has(t.id),
        totalInscritos: contagemInscritos[t.id] ?? 0,
      })),
      total,
      limite: paginacao.limite,
      offset: paginacao.offset,
    };
    await this.cache?.salvar(CACHE_PK_TORNEIOS, cacheKey, saida, getCacheTtlSegundos("DYNAMODB_CACHE_TTL_LISTAR_TORNEIOS_SECONDS", 30));
    return saida;
  }
}
