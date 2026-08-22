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
  version: number;
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
    const item = this.torneioParaItem(torneio);
    const requests = this.requestsSalvarIndices(item);
    const principal = requests.shift()!.PutRequest!.Item!;
    await this.transactWrite([
      {
        Put: {
          TableName: this.tabela,
          Item: principal,
          ConditionExpression: "attribute_not_exists(pk)",
        },
      },
      ...requests.map((request) => ({ Put: { TableName: this.tabela, Item: request.PutRequest!.Item! } })),
    ]);
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
    if (!anterior) return;
    const versaoEsperada = torneio.version;
    const itemAnterior = this.torneioParaItem(anterior);
    const itemAtual = { ...this.torneioParaItem(torneio), version: versaoEsperada + 1 };
    const requests = this.requestsSalvarIndices(itemAtual);
    const principal = requests.shift()!.PutRequest!.Item!;
    const obsoletos = this.requestsIndicesObsoletos(itemAnterior, itemAtual);
    try {
      await this.transactWrite([
        {
          Put: {
            TableName: this.tabela,
            Item: principal,
            ConditionExpression: "attribute_not_exists(#version) OR #version = :version",
            ExpressionAttributeNames: { "#version": "version" },
            ExpressionAttributeValues: { ":version": { N: String(versaoEsperada) } },
          },
        },
        ...requests.map((request) => ({ Put: { TableName: this.tabela, Item: request.PutRequest!.Item! } })),
        ...obsoletos.map((request) => ({ Delete: { TableName: this.tabela, Key: request.DeleteRequest!.Key! } })),
      ]);
      torneio.version = itemAtual.version;
    } catch (error) {
      if ((error as { name?: string }).name === "TransactionCanceledException") {
        throw new Error(`Conflito de concorrencia ao atualizar torneio ${torneio.id}`);
      }
      throw error;
    }
  }

  public async incrementarVisualizacoes(id: string): Promise<Torneio | null> {
    const torneio = await this.buscarPorId(id);
    if (!torneio) return null;
    const item = this.torneioParaItem(torneio);
    const chaves = [
      { pk: `TORNEIO#${item.id}`, sk: "METADATA" },
      { pk: TORNEIOS_PK, sk: this.skTorneio(item) },
      { pk: `DONO#${item.donoId}`, sk: `TORNEIO#${item.id}` },
      ...(item.anfitriaoId ? [{ pk: `ANFITRIAO#${item.anfitriaoId}`, sk: `TORNEIO#${item.id}` }] : []),
    ];
    await this.transactWrite(chaves.map(({ pk, sk }) => ({
      Update: {
        TableName: this.tabela,
        Key: { pk: { S: pk }, sk: { S: sk } },
        UpdateExpression: "SET visualizacoes = if_not_exists(visualizacoes, :base) + :incremento",
        ExpressionAttributeValues: {
          ":base": { N: String(item.visualizacoes) },
          ":incremento": { N: "1" },
        },
        ConditionExpression: "attribute_exists(pk)",
      },
    })));
    return this.buscarPorId(id);
  }

  public async atualizarECriarPartidas(torneio: Torneio, partidas: Partida[]): Promise<void> {
    const partidaRepositorio = PartidaDynamoRepositorio.criar();
    if (partidas.length === 0) {
      await this.atualizar(torneio);
      return;
    }
    try {
      await partidaRepositorio.salvarVarias(partidas);
      await this.atualizar(torneio);
    } catch (error) {
      await partidaRepositorio.excluirPorIds(partidas.map((partida) => partida.id)).catch(() => undefined);
      throw error;
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

  private requestsSalvarIndices(item: TorneioItem) {
    const requests = [
      this.toPutRequest(`TORNEIO#${item.id}`, "METADATA", item, { entity: "TORNEIO", status: item.status, version: item.version, visualizacoes: item.visualizacoes }),
      this.toPutRequest(TORNEIOS_PK, this.skTorneio(item), item, { entity: "TORNEIO_INDEX", status: item.status, visualizacoes: item.visualizacoes }),
      this.toPutRequest(`DONO#${item.donoId}`, `TORNEIO#${item.id}`, item, { entity: "TORNEIO_DONO", status: item.status, visualizacoes: item.visualizacoes }),
    ];
    if (item.anfitriaoId) {
      requests.push(this.toPutRequest(`ANFITRIAO#${item.anfitriaoId}`, `TORNEIO#${item.id}`, item, { entity: "TORNEIO_ANFITRIAO", status: item.status, visualizacoes: item.visualizacoes }));
    }
    return requests;
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
    await this.transactWriteRequests(requests);
  }

  private requestsIndicesObsoletos(anterior: TorneioItem, atual: TorneioItem) {
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
    return requests;
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
      version: torneio.version,
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
      version: item.version ?? 0,
    });
  }
}
