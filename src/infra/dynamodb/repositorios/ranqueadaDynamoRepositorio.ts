import type { RanqueadaGateway } from "../../../dominio/gateway/ranqueadaGateway";
import type { EntradaFilaRanqueada, EstadoRanqueado, PartidaRanqueada, PunicaoRanqueada, RankingRanqueado } from "../../../dominio/entidade/ranqueada";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

export class RanqueadaDynamoRepositorio extends BaseDynamoRepositorio implements RanqueadaGateway {
  private constructor() { super(); }
  public static criar() { return new RanqueadaDynamoRepositorio(); }

  public buscarRanking(jogadorId: string, formato: string) { return this.getJson<RankingRanqueado>(`RANKED_PLAYER#${jogadorId}`, `FORMAT#${formato}`); }
  public buscarEstado(jogadorId: string, formato: string) { return this.getJson<EstadoRanqueado>(`RANKED_STATE#${jogadorId}`, `FORMAT#${formato}`); }
  public buscarPartida(id: string) { return this.getJson<PartidaRanqueada>(`RANKED_MATCH#${id}`, "DATA"); }
  public buscarEntrada(jogadorId: string) { return this.getJson<EntradaFilaRanqueada>(`RANKED_QUEUE_PLAYER#${jogadorId}`, "DATA"); }
  public listarFila(formato: string) { return this.queryJson<EntradaFilaRanqueada>(`RANKED_QUEUE#${formato}`); }
  public listarRanking(formato: string) { return this.queryJson<RankingRanqueado>(`RANKED_LEADERBOARD#${formato}`); }
  public listarContestadas() { return this.queryJson<PartidaRanqueada>("RANKED_CONTESTED"); }
  public listarAguardandoConfirmacao() { return this.queryJson<PartidaRanqueada>("RANKED_PENDING_RESULTS"); }
  public listarHistorico(jogadorId: string) { return this.queryJson<PartidaRanqueada>(`RANKED_HISTORY#${jogadorId}`); }
  public buscarPunicao(jogadorId: string) { return this.getJson<PunicaoRanqueada>(`RANKED_PENALTY#${jogadorId}`, "DATA"); }

  public async salvarPunicao(p: PunicaoRanqueada, warningsEsperados: number): Promise<boolean> {
    try {
      await this.transactWrite([{ Put: {
        TableName: this.tabela,
        Item: this.itemJson(`RANKED_PENALTY#${p.jogadorId}`, "DATA", p, { warnings: p.warnings }),
        ConditionExpression: warningsEsperados === 0 ? "attribute_not_exists(pk) OR warnings = :esperados" : "warnings = :esperados",
        ExpressionAttributeValues: { ":esperados": { N: String(warningsEsperados) } },
      } }]);
      return true;
    } catch (error) {
      if ((error as { name?: string }).name === "TransactionCanceledException") return false;
      throw error;
    }
  }

  public async entrarNaFila(e: EntradaFilaRanqueada, estado: EstadoRanqueado): Promise<void> {
    await this.transactWrite([
      { Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_QUEUE_PLAYER#${e.jogadorId}`, "DATA", e), ConditionExpression: "attribute_not_exists(pk)" } },
      { Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_QUEUE#${e.formato}`, `PLAYER#${e.jogadorId}`, e) } },
      { Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_STATE#${e.jogadorId}`, `FORMAT#${e.formato}`, estado) } },
    ]);
  }

  public async sairDaFila(e: EntradaFilaRanqueada): Promise<void> {
    await this.transactWrite([
      { Delete: { TableName: this.tabela, Key: { pk: { S: `RANKED_QUEUE_PLAYER#${e.jogadorId}` }, sk: { S: "DATA" } } } },
      { Delete: { TableName: this.tabela, Key: { pk: { S: `RANKED_QUEUE#${e.formato}` }, sk: { S: `PLAYER#${e.jogadorId}` } } } },
    ]);
  }

  public async abandonarCampanha(estado: EstadoRanqueado, entrada: EntradaFilaRanqueada | null): Promise<boolean> {
    try {
      await this.transactWrite([
        ...(entrada ? [
          { Delete: { TableName: this.tabela, Key: { pk: { S: `RANKED_QUEUE_PLAYER#${entrada.jogadorId}` }, sk: { S: "DATA" } }, ConditionExpression: "attribute_exists(pk)" } },
          { Delete: { TableName: this.tabela, Key: { pk: { S: `RANKED_QUEUE#${entrada.formato}` }, sk: { S: `PLAYER#${entrada.jogadorId}` } } } },
        ] : []),
        { Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_STATE#${estado.jogadorId}`, `FORMAT#${estado.formato}`, estado) } },
      ]);
      return true;
    } catch (error) {
      if ((error as { name?: string }).name === "TransactionCanceledException") return false;
      throw error;
    }
  }

  public async parear(a: EntradaFilaRanqueada, b: EntradaFilaRanqueada, p: PartidaRanqueada): Promise<boolean> {
    try {
      const estado = (e: EntradaFilaRanqueada, oponenteId: string): EstadoRanqueado => ({ jogadorId: e.jogadorId, formato: e.formato, vitoriasCampanha: e.vitoriasCampanha, derrotasCampanha: e.derrotasCampanha, partidasCampanha: e.partidasCampanha, deckCampanhaId: e.deckId, deckCampanhaNome: e.deckNome, deckCampanha: e.deckSnapshot, ultimoOponenteId: oponenteId, partidaId: p.id });
      await this.transactWrite([
        ...[a, b].flatMap((e) => [
          { Delete: { TableName: this.tabela, Key: { pk: { S: `RANKED_QUEUE_PLAYER#${e.jogadorId}` }, sk: { S: "DATA" } }, ConditionExpression: "attribute_exists(pk)" } },
          { Delete: { TableName: this.tabela, Key: { pk: { S: `RANKED_QUEUE#${e.formato}` }, sk: { S: `PLAYER#${e.jogadorId}` } } } },
          { Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_STATE#${e.jogadorId}`, `FORMAT#${e.formato}`, estado(e, e.jogadorId === a.jogadorId ? b.jogadorId : a.jogadorId)) } },
        ]),
        { Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_MATCH#${p.id}`, "DATA", p, { status: p.status }) } },
        ...[a.jogadorId, b.jogadorId].map((jogadorId) => ({ Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_HISTORY#${jogadorId}`, `${p.criadoEm}#${p.id}`, p) } })),
      ]);
      return true;
    } catch (error) {
      if ((error as { name?: string }).name === "TransactionCanceledException") return false;
      throw error;
    }
  }

  public async atualizarPartida(p: PartidaRanqueada, statusEsperado: PartidaRanqueada["status"]): Promise<boolean> {
    return this.atualizarPartidaCondicional(p, statusEsperado);
  }

  public async contestarPartida(p: PartidaRanqueada, estados: EstadoRanqueado[]): Promise<boolean> {
    try {
      await this.transactWrite([
        { Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_MATCH#${p.id}`, "DATA", p, { status: p.status }), ConditionExpression: "#status = :esperado", ExpressionAttributeNames: { "#status": "status" }, ExpressionAttributeValues: { ":esperado": { S: "aguardando_confirmacao" } } } },
        { Put: { TableName: this.tabela, Item: this.itemJson("RANKED_CONTESTED", `MATCH#${p.id}`, p) } },
        { Delete: { TableName: this.tabela, Key: { pk: { S: "RANKED_PENDING_RESULTS" }, sk: { S: `MATCH#${p.id}` } } } },
        ...[p.jogador1Id, p.jogador2Id].map((jogadorId) => ({ Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_HISTORY#${jogadorId}`, `${p.criadoEm}#${p.id}`, p) } })),
        ...estados.map((e) => ({ Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_STATE#${e.jogadorId}`, `FORMAT#${e.formato}`, e) } })),
      ]);
      return true;
    } catch (error) {
      if ((error as { name?: string }).name === "TransactionCanceledException") return false;
      throw error;
    }
  }

  public async finalizar(p: PartidaRanqueada, rankings: RankingRanqueado[], estados: EstadoRanqueado[], statusEsperado: PartidaRanqueada["status"]): Promise<boolean> {
    try {
      await this.transactWrite([
        { Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_MATCH#${p.id}`, "DATA", p, { status: p.status }), ConditionExpression: "#status = :esperado", ExpressionAttributeNames: { "#status": "status" }, ExpressionAttributeValues: { ":esperado": { S: statusEsperado } } } },
        ...rankings.flatMap((r) => [
          { Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_PLAYER#${r.jogadorId}`, `FORMAT#${r.formato}`, r) } },
          { Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_LEADERBOARD#${r.formato}`, `PLAYER#${r.jogadorId}`, r) } },
        ]),
        ...estados.map((e) => ({ Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_STATE#${e.jogadorId}`, `FORMAT#${e.formato}`, e) } })),
        ...[p.jogador1Id, p.jogador2Id].map((jogadorId) => ({ Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_HISTORY#${jogadorId}`, `${p.criadoEm}#${p.id}`, p) } })),
        { Delete: { TableName: this.tabela, Key: { pk: { S: "RANKED_PENDING_RESULTS" }, sk: { S: `MATCH#${p.id}` } } } },
        ...(statusEsperado === "contestada" ? [{ Delete: { TableName: this.tabela, Key: { pk: { S: "RANKED_CONTESTED" }, sk: { S: `MATCH#${p.id}` } } } }] : []),
      ]);
      return true;
    } catch (error) {
      if ((error as { name?: string }).name === "TransactionCanceledException") return false;
      throw error;
    }
  }

  private async atualizarPartidaCondicional(p: PartidaRanqueada, statusEsperado: PartidaRanqueada["status"]): Promise<boolean> {
    try {
      await this.transactWrite([
        { Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_MATCH#${p.id}`, "DATA", p, { status: p.status }), ConditionExpression: "#status = :esperado", ExpressionAttributeNames: { "#status": "status" }, ExpressionAttributeValues: { ":esperado": { S: statusEsperado } } } },
        ...(p.status === "contestada" ? [{ Put: { TableName: this.tabela, Item: this.itemJson("RANKED_CONTESTED", `MATCH#${p.id}`, p) } }] : []),
        ...(p.status === "aguardando_confirmacao" ? [{ Put: { TableName: this.tabela, Item: this.itemJson("RANKED_PENDING_RESULTS", `MATCH#${p.id}`, p) } }] : []),
        ...[p.jogador1Id, p.jogador2Id].map((jogadorId) => ({ Put: { TableName: this.tabela, Item: this.itemJson(`RANKED_HISTORY#${jogadorId}`, `${p.criadoEm}#${p.id}`, p) } })),
        ...(statusEsperado === "aguardando_confirmacao" && p.status !== "aguardando_confirmacao" ? [{ Delete: { TableName: this.tabela, Key: { pk: { S: "RANKED_PENDING_RESULTS" }, sk: { S: `MATCH#${p.id}` } } } }] : []),
      ]);
      return true;
    } catch (error) {
      if ((error as { name?: string }).name === "TransactionCanceledException") return false;
      throw error;
    }
  }
}
