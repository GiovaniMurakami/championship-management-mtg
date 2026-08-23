import { Inscricao } from "../../../dominio/entidade/inscricao";
import { InscricaoGateway } from "../../../dominio/gateway/inscricaoGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type InscricaoItem = {
  id: string;
  torneioId: string;
  usuarioId: string;
  deckId?: string;
  timeId?: string;
  checkInRodada: number;
  dropped: boolean;
  droppedRodada?: number | null;
  dropPartidaIds: string[];
  byeCount: number;
  criadoEm: string;
};

const INSCRICOES_PK = "INSCRICOES";

export class InscricaoDynamoRepositorio extends BaseDynamoRepositorio implements InscricaoGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new InscricaoDynamoRepositorio();
  }

  public async salvar(inscricao: Inscricao): Promise<void> {
    await this.salvarIndices(this.inscricaoParaItem(inscricao));
  }

  public async buscarPorTorneioEUsuario(torneioId: string, usuarioId: string): Promise<Inscricao | null> {
    const item = await this.getJson<InscricaoItem>(`TORNEIO#${torneioId}`, `INSCRICAO#${usuarioId}`);
    return item ? this.itemParaInscricao(item) : null;
  }

  public async listarPorTorneio(torneioId: string): Promise<Inscricao[]> {
    const itens = await this.queryJson<InscricaoItem>(`TORNEIO#${torneioId}`);
    return itens
      .filter((item) => item.id && item.usuarioId)
      .map((item) => this.itemParaInscricao(item));
  }

  public async listarPorTorneios(torneioIds: string[]): Promise<Inscricao[]> {
    if (torneioIds.length === 0) return [];
    const listas = await Promise.all(torneioIds.map((id) => this.listarPorTorneio(id)));
    return listas.flat();
  }

  public async listarPorUsuario(usuarioId: string): Promise<Inscricao[]> {
    const itens = await this.queryJson<InscricaoItem>(`USER#${usuarioId}`);
    return itens
      .filter((item) => item.id && item.torneioId)
      .map((item) => this.itemParaInscricao(item));
  }

  public async atualizar(inscricao: Inscricao): Promise<void> {
    await this.salvarIndices(this.inscricaoParaItem(inscricao));
  }

  public async excluir(id: string): Promise<void> {
    const item = await this.getJson<InscricaoItem>(`INSCRICAO#${id}`, "DATA");
    if (!item) return;
    await this.transactWriteRequests([
      this.toDeleteRequest(`INSCRICAO#${id}`, "DATA"),
      this.toDeleteRequest(`TORNEIO#${item.torneioId}`, `INSCRICAO#${item.usuarioId}`),
      this.toDeleteRequest(`USER#${item.usuarioId}`, `INSCRICAO#${item.torneioId}`),
      this.toDeleteRequest(INSCRICOES_PK, `INSCRICAO#${id}`),
    ]);
  }

  public async excluirPorUsuario(usuarioId: string): Promise<number> {
    const inscricoes = await this.listarPorUsuario(usuarioId);
    await Promise.all(inscricoes.map((inscricao) => this.excluir(inscricao.id)));
    return inscricoes.length;
  }

  public async contarPorTorneios(torneioIds: string[]): Promise<Record<string, number>> {
    const pares = await Promise.all(torneioIds.map(async (torneioId) => [
      torneioId,
      (await this.listarPorTorneio(torneioId)).length,
    ] as const));
    return pares.reduce<Record<string, number>>((acc, [torneioId, total]) => {
      acc[torneioId] = total;
      return acc;
    }, {});
  }

  public async contarJogadoresDistintos(): Promise<number> {
    const itens = await this.queryJson<InscricaoItem>(INSCRICOES_PK);
    return new Set(itens.map((item) => item.usuarioId)).size;
  }

  private async salvarIndices(item: InscricaoItem): Promise<void> {
    await this.transactWriteRequests([
      this.toPutRequest(`INSCRICAO#${item.id}`, "DATA", item, { entity: "INSCRICAO" }),
      this.toPutRequest(`TORNEIO#${item.torneioId}`, `INSCRICAO#${item.usuarioId}`, item, { entity: "INSCRICAO_TORNEIO" }),
      this.toPutRequest(`USER#${item.usuarioId}`, `INSCRICAO#${item.torneioId}`, item, { entity: "INSCRICAO_USUARIO" }),
      this.toPutRequest(INSCRICOES_PK, `INSCRICAO#${item.id}`, item, { entity: "INSCRICAO_INDEX" }),
    ]);
  }

  private inscricaoParaItem(inscricao: Inscricao): InscricaoItem {
    return {
      id: inscricao.id,
      torneioId: inscricao.torneioId,
      usuarioId: inscricao.usuarioId,
      deckId: inscricao.deckId,
      timeId: inscricao.timeId,
      checkInRodada: inscricao.checkInRodada,
      dropped: inscricao.dropped,
      droppedRodada: inscricao.droppedRodada,
      dropPartidaIds: inscricao.dropPartidaIds,
      byeCount: inscricao.byeCount,
      criadoEm: inscricao.criadoEm.toISOString(),
    };
  }

  private itemParaInscricao(item: InscricaoItem): Inscricao {
    return new Inscricao({
      id: item.id,
      torneioId: item.torneioId,
      usuarioId: item.usuarioId,
      deckId: item.deckId,
      timeId: item.timeId,
      checkInRodada: item.checkInRodada,
      dropped: item.dropped,
      droppedRodada: item.droppedRodada,
      dropPartidaIds: item.dropPartidaIds,
      byeCount: item.byeCount,
      criadoEm: new Date(item.criadoEm),
    });
  }
}
