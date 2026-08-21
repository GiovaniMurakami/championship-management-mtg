import { ExibirNomeJogador, StatusTorneio, StoryFundoTextoRodape, Torneio } from "../../../dominio/entidade/torneio";
import { Partida } from "../../../dominio/entidade/partida";
import { FiltrosListarTorneios, TorneioGateway } from "../../../dominio/gateway/torneioGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";
import { PartidaDynamoRepositorio } from "./partidaDynamoRepositorio";

type TorneioItem = {
  id: string;
  nome: string;
  horario: string;
  formato: string;
  donoId: string;
  anfitriaoId?: string | null;
  status: StatusTorneio;
  rodadaAtual: number;
  totalRodadas: number;
  descricao?: string;
  regras?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  storyFundoUrl?: string;
  storyFundoTextoRodape?: StoryFundoTextoRodape;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  linkLive?: string;
  emCorte: boolean;
  secreto: boolean;
  exibirNomeJogador: ExibirNomeJogador;
  visualizacoes: number;
  criadoEm: string;
  rodadaIniciadaEm?: string;
};

const TORNEIOS_PK = "TORNEIOS";

export class TorneioDynamoRepositorio extends BaseDynamoRepositorio implements TorneioGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new TorneioDynamoRepositorio();
  }

  public async salvar(torneio: Torneio): Promise<void> {
    await this.salvarIndices(this.torneioParaItem(torneio));
  }

  public async buscarPorId(id: string): Promise<Torneio | null> {
    const item = await this.getJson<TorneioItem>(`TORNEIO#${id}`, "METADATA");
    return item ? this.itemParaTorneio(item) : null;
  }

  public async listar(filtros: FiltrosListarTorneios = {}): Promise<Torneio[]> {
    const itens = await this.queryJson<TorneioItem>(TORNEIOS_PK);
    const filtrados = this.filtrar(itens, filtros)
      .sort((a, b) => {
        const diff = new Date(a.horario).getTime() - new Date(b.horario).getTime() || a.id.localeCompare(b.id);
        return filtros.horarioDesc ? -diff : diff;
      });

    const offset = filtros.offset ?? 0;
    const limite = filtros.limite ?? filtrados.length;
    return filtrados.slice(offset, offset + limite).map((item) => this.itemParaTorneio(item));
  }

  public async listarTotal(
    filtros: Pick<FiltrosListarTorneios, "incluirSecretos" | "status" | "nome" | "dataInicio" | "dataFim"> = {}
  ): Promise<number> {
    const itens = await this.queryJson<TorneioItem>(TORNEIOS_PK);
    return this.filtrar(itens, filtros).length;
  }

  public async atualizar(torneio: Torneio): Promise<void> {
    const anterior = await this.buscarPorId(torneio.id);
    const itemAtual = this.torneioParaItem(torneio);
    await this.salvarIndices(itemAtual);

    if (anterior) {
      await this.removerIndicesObsoletos(this.torneioParaItem(anterior), itemAtual);
    }
  }

  public async incrementarVisualizacoes(id: string): Promise<Torneio | null> {
    const torneio = await this.buscarPorId(id);
    if (!torneio) return null;
    torneio.visualizacoes += 1;
    await this.atualizar(torneio);
    return torneio;
  }

  public async atualizarECriarPartidas(torneio: Torneio, partidas: Partida[]): Promise<void> {
    await this.atualizar(torneio);
    if (partidas.length > 0) {
      await PartidaDynamoRepositorio.criar().salvarVarias(partidas);
    }
  }

  public async excluir(id: string): Promise<void> {
    const torneio = await this.buscarPorId(id);
    if (!torneio) return;
    await this.removerIndices(this.torneioParaItem(torneio));
  }

  public async contarPorDono(donoId: string): Promise<number> {
    return (await this.queryJson<TorneioItem>(`DONO#${donoId}`)).length;
  }

  public async removerAnfitriaoDoUsuario(usuarioId: string): Promise<number> {
    const itens = await this.queryJson<TorneioItem>(`ANFITRIAO#${usuarioId}`);
    const torneios = itens.map((item) => this.itemParaTorneio(item));
    await Promise.all(torneios.map((torneio) => {
      torneio.anfitriaoId = null;
      return this.atualizar(torneio);
    }));
    return torneios.length;
  }

  private filtrar(
    itens: TorneioItem[],
    filtros: Pick<FiltrosListarTorneios, "incluirSecretos" | "status" | "nome" | "dataInicio" | "dataFim">
  ): TorneioItem[] {
    const termo = filtros.nome?.trim().toLowerCase();
    return itens.filter((item) => {
      if (!filtros.incluirSecretos && item.secreto) return false;
      if (filtros.status && item.status !== filtros.status) return false;
      if (termo && !item.nome.toLowerCase().includes(termo)) return false;
      const horario = new Date(item.horario).getTime();
      if (filtros.dataInicio && horario < filtros.dataInicio.getTime()) return false;
      if (filtros.dataFim && horario > filtros.dataFim.getTime()) return false;
      return true;
    });
  }

  private async salvarIndices(item: TorneioItem): Promise<void> {
    const requests = [
      this.toPutRequest(`TORNEIO#${item.id}`, "METADATA", item, { entity: "TORNEIO", status: item.status }),
      this.toPutRequest(TORNEIOS_PK, this.skTorneio(item), item, { entity: "TORNEIO_INDEX", status: item.status }),
      this.toPutRequest(`DONO#${item.donoId}`, `TORNEIO#${item.id}`, item, { entity: "TORNEIO_DONO", status: item.status }),
    ];
    if (item.anfitriaoId) {
      requests.push(this.toPutRequest(`ANFITRIAO#${item.anfitriaoId}`, `TORNEIO#${item.id}`, item, { entity: "TORNEIO_ANFITRIAO", status: item.status }));
    }
    await this.batchWrite(requests);
  }

  private async removerIndices(item: TorneioItem): Promise<void> {
    const requests = [
      this.toDeleteRequest(`TORNEIO#${item.id}`, "METADATA"),
      this.toDeleteRequest(TORNEIOS_PK, this.skTorneio(item)),
      this.toDeleteRequest(`DONO#${item.donoId}`, `TORNEIO#${item.id}`),
    ];
    if (item.anfitriaoId) {
      requests.push(this.toDeleteRequest(`ANFITRIAO#${item.anfitriaoId}`, `TORNEIO#${item.id}`));
    }
    await this.batchWrite(requests);
  }

  private async removerIndicesObsoletos(anterior: TorneioItem, atual: TorneioItem): Promise<void> {
    const requests = [];
    if (this.skTorneio(anterior) !== this.skTorneio(atual)) {
      requests.push(this.toDeleteRequest(TORNEIOS_PK, this.skTorneio(anterior)));
    }
    if (anterior.donoId !== atual.donoId) {
      requests.push(this.toDeleteRequest(`DONO#${anterior.donoId}`, `TORNEIO#${anterior.id}`));
    }
    if (anterior.anfitriaoId && anterior.anfitriaoId !== atual.anfitriaoId) {
      requests.push(this.toDeleteRequest(`ANFITRIAO#${anterior.anfitriaoId}`, `TORNEIO#${anterior.id}`));
    }
    if (requests.length > 0) await this.batchWrite(requests);
  }

  private skTorneio(item: TorneioItem): string {
    return `TORNEIO#${item.horario}#${item.id}`;
  }

  private torneioParaItem(torneio: Torneio): TorneioItem {
    return {
      id: torneio.id,
      nome: torneio.nome,
      horario: torneio.horario.toISOString(),
      formato: torneio.formato,
      donoId: torneio.donoId,
      anfitriaoId: torneio.anfitriaoId ?? null,
      status: torneio.status,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
      descricao: torneio.descricao,
      regras: torneio.regras,
      bannerUrl: torneio.bannerUrl,
      linkBanner: torneio.linkBanner,
      somRodada: torneio.somRodada,
      storyFundoUrl: torneio.storyFundoUrl,
      storyFundoTextoRodape: torneio.storyFundoTextoRodape,
      maxJogadores: torneio.maxJogadores,
      maxRodadas: torneio.maxRodadas,
      corteTop: torneio.corteTop,
      linkLive: torneio.linkLive,
      emCorte: torneio.emCorte,
      secreto: torneio.secreto,
      exibirNomeJogador: torneio.exibirNomeJogador,
      visualizacoes: torneio.visualizacoes,
      criadoEm: torneio.criadoEm.toISOString(),
      rodadaIniciadaEm: torneio.rodadaIniciadaEm?.toISOString(),
    };
  }

  private itemParaTorneio(item: TorneioItem): Torneio {
    return new Torneio({
      id: item.id,
      nome: item.nome,
      horario: new Date(item.horario),
      formato: item.formato,
      donoId: item.donoId,
      anfitriaoId: item.anfitriaoId ?? null,
      status: item.status,
      rodadaAtual: item.rodadaAtual,
      totalRodadas: item.totalRodadas,
      descricao: item.descricao,
      regras: item.regras,
      bannerUrl: item.bannerUrl,
      linkBanner: item.linkBanner,
      somRodada: item.somRodada,
      storyFundoUrl: item.storyFundoUrl,
      storyFundoTextoRodape: item.storyFundoTextoRodape,
      maxJogadores: item.maxJogadores,
      maxRodadas: item.maxRodadas,
      corteTop: item.corteTop,
      linkLive: item.linkLive,
      emCorte: item.emCorte,
      secreto: item.secreto,
      exibirNomeJogador: item.exibirNomeJogador,
      visualizacoes: item.visualizacoes,
      criadoEm: new Date(item.criadoEm),
      rodadaIniciadaEm: item.rodadaIniciadaEm ? new Date(item.rodadaIniciadaEm) : undefined,
    });
  }
}
