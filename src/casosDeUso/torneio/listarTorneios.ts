import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { StatusTorneio } from "../../dominio/entidade/torneio";
import { CasoDeUso } from "../casoDeUso";
import { normalizarPaginacaoOffset } from "../../helpers/paginacao";

const LIMITE_MAXIMO_TORNEIOS = 100;
const LIMITE_PADRAO_TORNEIOS = 20;

export type ListarTorneiosInputDto = {
  usuarioId: string;
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
    horario: Date;
    formato: string;
    donoId: string;
    status: string;
    rodadaAtual: number;
    totalRodadas: number;
    descricao?: string;
    bannerUrl?: string;
    linkBanner?: string;
    somRodada?: string;
    maxJogadores?: number;
    maxRodadas?: number;
    corteTop?: number;
    linkLive?: string;
    emCorte: boolean;
    secreto: boolean;
    visualizacoes: number;
    criadoEm: Date;
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
    private readonly inscricaoGateway: InscricaoGateway
  ) { }

  public static criar(torneioGateway: TorneioGateway, inscricaoGateway: InscricaoGateway) {
    return new ListarTorneios(torneioGateway, inscricaoGateway);
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

    const [torneios, total, inscricoes] = await Promise.all([
      this.torneioGateway.listar({
        limite: paginacao.limite,
        offset: paginacao.offset,
        incluirSecretos: false,
        status,
        nome,
        dataInicio,
        dataFim,
      }),
      this.torneioGateway.listarTotal({ incluirSecretos: false, status, nome, dataInicio, dataFim }),
      this.inscricaoGateway.listarPorUsuario(usuarioId),
    ]);

    const torneiosInscritos = new Set(inscricoes.map((i) => i.torneioId));
    const torneioIds = torneios.map((t) => t.id);
    const contagemInscritos = torneioIds.length > 0
      ? await this.inscricaoGateway.contarPorTorneios(torneioIds)
      : {};

    return {
      torneios: torneios.map((t) => ({
        id: t.id,
        nome: t.nome,
        horario: t.horario,
        formato: t.formato,
        donoId: t.donoId,
        status: t.status,
        rodadaAtual: t.rodadaAtual,
        totalRodadas: t.totalRodadas,
        descricao: t.descricao,
        bannerUrl: t.bannerUrl,
        linkBanner: t.linkBanner,
        somRodada: t.somRodada,
        maxJogadores: t.maxJogadores,
        maxRodadas: t.maxRodadas,
        corteTop: t.corteTop,
        linkLive: t.linkLive,
        emCorte: t.emCorte,
        secreto: t.secreto,
        visualizacoes: t.visualizacoes,
        criadoEm: t.criadoEm,
        inscrito: torneiosInscritos.has(t.id),
        totalInscritos: contagemInscritos[t.id] ?? 0,
      })),
      total,
      limite: paginacao.limite,
      offset: paginacao.offset,
    };
  }
}
