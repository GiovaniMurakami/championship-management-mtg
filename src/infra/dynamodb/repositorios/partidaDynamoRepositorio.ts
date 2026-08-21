import { Partida, StatusPartida, TipoBye } from "../../../dominio/entidade/partida";
import { PartidaGateway } from "../../../dominio/gateway/partidaGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type PartidaItem = {
  id: string;
  torneioId: string;
  rodada: number;
  jogador1Id: string;
  jogador2Id: string | null;
  deckJogador1Id?: string;
  deckJogador2Id?: string | null;
  vitoriasJogador1: number;
  vitoriasJogador2: number;
  status: StatusPartida;
  contestado: boolean;
  observacaoContestacao?: string | null;
  tipoBye: TipoBye;
  confirmadoPor: string[];
  mesa: number | null;
  criadoEm: string;
};

export class PartidaDynamoRepositorio extends BaseDynamoRepositorio implements PartidaGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new PartidaDynamoRepositorio();
  }

  public async salvar(partida: Partida): Promise<void> {
    await this.salvarIndices(this.partidaParaItem(partida));
  }

  public async salvarVarias(partidas: Partida[]): Promise<void> {
    for (const partida of partidas) {
      await this.salvar(partida);
    }
  }

  public async buscarPorId(id: string): Promise<Partida | null> {
    const item = await this.getJson<PartidaItem>(`PARTIDA#${id}`, "DATA");
    return item ? this.itemParaPartida(item) : null;
  }

  public async listarPorTorneio(torneioId: string): Promise<Partida[]> {
    const itens = await this.queryJson<PartidaItem>(`TORNEIO#${torneioId}`);
    return itens
      .filter((item) => item.id && item.rodada !== undefined && item.jogador1Id)
      .map((item) => this.itemParaPartida(item))
      .sort((a, b) => a.rodada - b.rodada || (a.mesa ?? 9999) - (b.mesa ?? 9999));
  }

  public async listarPorTorneios(torneioIds: string[]): Promise<Partida[]> {
    if (torneioIds.length === 0) return [];
    const listas = await Promise.all(torneioIds.map((id) => this.listarPorTorneio(id)));
    return listas.flat();
  }

  public async listarPorTorneioERodada(torneioId: string, rodada: number): Promise<Partida[]> {
    const itens = await this.queryJson<PartidaItem>(`TORNEIO#${torneioId}#RODADA#${rodada}`);
    return itens
      .map((item) => this.itemParaPartida(item))
      .sort((a, b) => (a.mesa ?? 9999) - (b.mesa ?? 9999) || a.id.localeCompare(b.id));
  }

  public async listarPorJogadorETorneio(torneioId: string, usuarioId: string): Promise<Partida[]> {
    return (await this.listarPorTorneio(torneioId))
      .filter((partida) => partida.jogador1Id === usuarioId || partida.jogador2Id === usuarioId);
  }

  public async listarPorDeckIds(deckIds: string[]): Promise<Partida[]> {
    const listas = await Promise.all(Array.from(new Set(deckIds)).map(async (deckId) => {
      const itens = await this.queryJson<PartidaItem>(`DECK#${deckId}`);
      return itens.map((item) => this.itemParaPartida(item));
    }));
    const porId = new Map<string, Partida>();
    for (const partida of listas.flat()) porId.set(partida.id, partida);
    return Array.from(porId.values()).sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  }

  public async atualizar(partida: Partida): Promise<void> {
    const anterior = await this.buscarPorId(partida.id);
    if (anterior) await this.removerIndices(this.partidaParaItem(anterior));
    await this.salvarIndices(this.partidaParaItem(partida));
  }

  public async finalizarAtomicamente(id: string, v1: number, v2: number): Promise<Partida | null> {
    const partida = await this.buscarPorId(id);
    if (!partida || partida.status !== "pendente") return null;
    partida.vitoriasJogador1 = v1;
    partida.vitoriasJogador2 = v2;
    partida.status = "finalizada";
    const item = this.partidaParaItem(partida);
    const atualizado = await this.updatePayloadIf(
      `PARTIDA#${id}`,
      "DATA",
      item,
      "#status = :pendente",
      { ":pendente": { S: "pendente" } },
      { status: item.status }
    );
    if (!atualizado) return null;
    await this.atualizar(partida);
    return partida;
  }

  public async contestarPartida(id: string, observacao?: string | null): Promise<Partida | null> {
    const partida = await this.buscarPorId(id);
    if (!partida || partida.status !== "finalizada") return null;
    partida.contestado = true;
    const observacaoLimpa = typeof observacao === "string" ? observacao.trim() : "";
    partida.observacaoContestacao = observacaoLimpa || null;
    await this.atualizar(partida);
    return partida;
  }

  public async ajustarResultadoContestado(id: string, v1: number, v2: number): Promise<Partida | null> {
    const partida = await this.buscarPorId(id);
    if (!partida || !partida.contestado) return null;
    partida.vitoriasJogador1 = v1;
    partida.vitoriasJogador2 = v2;
    partida.contestado = false;
    partida.observacaoContestacao = null;
    partida.status = "finalizada";
    await this.atualizar(partida);
    return partida;
  }

  public async atualizarJogador2Partida(id: string, jogador2Id: string): Promise<Partida | null> {
    const partida = await this.buscarPorId(id);
    if (!partida || partida.jogador2Id !== null) return null;
    partida.jogador2Id = jogador2Id;
    await this.atualizar(partida);
    return partida;
  }

  public async existePartidaRodadaPosterior(torneioId: string, rodada: number): Promise<boolean> {
    return (await this.listarPorTorneio(torneioId)).some((partida) => partida.rodada > rodada);
  }

  public async excluirPorTorneioERodada(torneioId: string, rodada: number): Promise<number> {
    const partidas = await this.listarPorTorneioERodada(torneioId, rodada);
    await Promise.all(partidas.map((partida) => this.excluirPartida(partida)));
    return partidas.length;
  }

  public async excluirPorIds(ids: string[]): Promise<number> {
    const partidas = (await Promise.all(ids.map((id) => this.buscarPorId(id))))
      .filter((partida): partida is Partida => partida !== null);
    await Promise.all(partidas.map((partida) => this.excluirPartida(partida)));
    return partidas.length;
  }

  public async buscarByePartidaRodada(torneioId: string, rodada: number): Promise<Partida | null> {
    return (await this.listarPorTorneioERodada(torneioId, rodada))
      .find((partida) => partida.jogador2Id === null) ?? null;
  }

  public async confirmarResultado(id: string, userId: string): Promise<Partida | null> {
    const partida = await this.buscarPorId(id);
    if (!partida || partida.status !== "finalizada" || partida.confirmadoPor.includes(userId)) return null;
    partida.confirmadoPor = [...partida.confirmadoPor, userId];
    await this.atualizar(partida);
    return partida;
  }

  public async atualizarMesa(id: string, mesa: number | null): Promise<Partida | null> {
    const partida = await this.buscarPorId(id);
    if (!partida) return null;
    partida.mesa = mesa;
    await this.atualizar(partida);
    return partida;
  }

  private async salvarIndices(item: PartidaItem): Promise<void> {
    const requests = [
      this.toPutRequest(`PARTIDA#${item.id}`, "DATA", item, { entity: "PARTIDA", status: item.status }),
      this.toPutRequest(`TORNEIO#${item.torneioId}`, this.skTorneio(item), item, { entity: "PARTIDA_TORNEIO", status: item.status }),
      this.toPutRequest(`TORNEIO#${item.torneioId}#RODADA#${item.rodada}`, `PARTIDA#${item.id}`, item, { entity: "PARTIDA_RODADA", status: item.status }),
    ];
    for (const deckId of [item.deckJogador1Id, item.deckJogador2Id].filter((deckId): deckId is string => Boolean(deckId))) {
      requests.push(this.toPutRequest(`DECK#${deckId}`, `PARTIDA#${item.id}`, item, { entity: "PARTIDA_DECK", status: item.status }));
    }
    await this.batchWrite(requests);
  }

  private async removerIndices(item: PartidaItem): Promise<void> {
    const requests = [
      this.toDeleteRequest(`PARTIDA#${item.id}`, "DATA"),
      this.toDeleteRequest(`TORNEIO#${item.torneioId}`, this.skTorneio(item)),
      this.toDeleteRequest(`TORNEIO#${item.torneioId}#RODADA#${item.rodada}`, `PARTIDA#${item.id}`),
    ];
    for (const deckId of [item.deckJogador1Id, item.deckJogador2Id].filter((deckId): deckId is string => Boolean(deckId))) {
      requests.push(this.toDeleteRequest(`DECK#${deckId}`, `PARTIDA#${item.id}`));
    }
    await this.batchWrite(requests);
  }

  private async excluirPartida(partida: Partida): Promise<void> {
    await this.removerIndices(this.partidaParaItem(partida));
  }

  private skTorneio(item: PartidaItem): string {
    return `PARTIDA#${String(item.rodada).padStart(2, "0")}#${String(item.mesa ?? 9999).padStart(4, "0")}#${item.id}`;
  }

  private partidaParaItem(partida: Partida): PartidaItem {
    return {
      id: partida.id,
      torneioId: partida.torneioId,
      rodada: partida.rodada,
      jogador1Id: partida.jogador1Id,
      jogador2Id: partida.jogador2Id,
      deckJogador1Id: partida.deckJogador1Id,
      deckJogador2Id: partida.deckJogador2Id,
      vitoriasJogador1: partida.vitoriasJogador1,
      vitoriasJogador2: partida.vitoriasJogador2,
      status: partida.status,
      contestado: partida.contestado,
      observacaoContestacao: partida.observacaoContestacao,
      tipoBye: partida.tipoBye,
      confirmadoPor: partida.confirmadoPor,
      mesa: partida.mesa,
      criadoEm: partida.criadoEm.toISOString(),
    };
  }

  private itemParaPartida(item: PartidaItem): Partida {
    return new Partida({
      id: item.id,
      torneioId: item.torneioId,
      rodada: item.rodada,
      jogador1Id: item.jogador1Id,
      jogador2Id: item.jogador2Id,
      deckJogador1Id: item.deckJogador1Id,
      deckJogador2Id: item.deckJogador2Id,
      vitoriasJogador1: item.vitoriasJogador1,
      vitoriasJogador2: item.vitoriasJogador2,
      status: item.status,
      contestado: item.contestado,
      observacaoContestacao: item.observacaoContestacao,
      tipoBye: item.tipoBye,
      confirmadoPor: item.confirmadoPor,
      mesa: item.mesa,
      criadoEm: new Date(item.criadoEm),
    });
  }
}
