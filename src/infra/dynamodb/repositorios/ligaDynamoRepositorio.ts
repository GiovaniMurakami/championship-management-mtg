import { Liga, TipoLiga } from "../../../dominio/entidade/liga";
import { FiltrosListarLigas, LigaGateway } from "../../../dominio/gateway/ligaGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type LigaItem = {
  id: string;
  nome: string;
  descricao?: string;
  donoId: string;
  torneioIds: string[];
  tipo: TipoLiga;
  criadoEm: string;
};

const LIGAS_PK = "LIGAS";

export class LigaDynamoRepositorio extends BaseDynamoRepositorio implements LigaGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new LigaDynamoRepositorio();
  }

  public async salvar(liga: Liga): Promise<void> {
    await this.salvarIndices(this.ligaParaItem(liga));
  }

  public async buscarPorId(id: string): Promise<Liga | null> {
    const item = await this.getJson<LigaItem>(`LIGA#${id}`, "DATA");
    return item ? this.itemParaLiga(item) : null;
  }

  public async listar(filtros: FiltrosListarLigas = {}): Promise<Liga[]> {
    const filtradas = this.filtrar(await this.queryJson<LigaItem>(LIGAS_PK), filtros)
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime() || a.id.localeCompare(b.id));
    const offset = filtros.offset ?? 0;
    const limite = filtros.limite ?? filtradas.length;
    return filtradas.slice(offset, offset + limite).map((item) => this.itemParaLiga(item));
  }

  public async listarTotal(filtros: Pick<FiltrosListarLigas, "tipo" | "nome"> = {}): Promise<number> {
    return this.filtrar(await this.queryJson<LigaItem>(LIGAS_PK), filtros).length;
  }

  public async buscarPorTorneioIds(torneioIds: string[]): Promise<Liga[]> {
    const listas = await Promise.all(Array.from(new Set(torneioIds)).map((id) => this.queryJson<LigaItem>(`TORNEIO#${id}#LIGAS`)));
    const porId = new Map<string, LigaItem>();
    for (const item of listas.flat()) porId.set(item.id, item);
    return Array.from(porId.values())
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime() || a.id.localeCompare(b.id))
      .map((item) => this.itemParaLiga(item));
  }

  public async atualizar(liga: Liga): Promise<void> {
    const anterior = await this.buscarPorId(liga.id);
    if (anterior) await this.removerIndices(this.ligaParaItem(anterior));
    await this.salvarIndices(this.ligaParaItem(liga));
  }

  public async excluir(id: string): Promise<void> {
    const liga = await this.buscarPorId(id);
    if (!liga) return;
    await this.removerIndices(this.ligaParaItem(liga));
  }

  private filtrar(itens: LigaItem[], filtros: Pick<FiltrosListarLigas, "tipo" | "nome">): LigaItem[] {
    const nome = filtros.nome?.trim().toLowerCase();
    return itens.filter((item) => {
      if (filtros.tipo && item.tipo !== filtros.tipo) return false;
      if (nome && !item.nome.toLowerCase().includes(nome)) return false;
      return true;
    });
  }

  private async salvarIndices(item: LigaItem): Promise<void> {
    const requests = [
      this.toPutRequest(`LIGA#${item.id}`, "DATA", item, { entity: "LIGA" }),
      this.toPutRequest(LIGAS_PK, this.skLiga(item), item, { entity: "LIGA_INDEX" }),
    ];
    for (const torneioId of item.torneioIds) {
      requests.push(this.toPutRequest(`TORNEIO#${torneioId}#LIGAS`, `LIGA#${item.id}`, item, { entity: "LIGA_TORNEIO" }));
    }
    await this.batchWrite(requests);
  }

  private async removerIndices(item: LigaItem): Promise<void> {
    const requests = [
      this.toDeleteRequest(`LIGA#${item.id}`, "DATA"),
      this.toDeleteRequest(LIGAS_PK, this.skLiga(item)),
    ];
    for (const torneioId of item.torneioIds) {
      requests.push(this.toDeleteRequest(`TORNEIO#${torneioId}#LIGAS`, `LIGA#${item.id}`));
    }
    await this.batchWrite(requests);
  }

  private skLiga(item: LigaItem): string {
    return `LIGA#${item.criadoEm}#${item.id}`;
  }

  private ligaParaItem(liga: Liga): LigaItem {
    return {
      id: liga.id,
      nome: liga.nome,
      descricao: liga.descricao,
      donoId: liga.donoId,
      torneioIds: liga.torneioIds,
      tipo: liga.tipo,
      criadoEm: liga.criadoEm.toISOString(),
    };
  }

  private itemParaLiga(item: LigaItem): Liga {
    return new Liga({
      id: item.id,
      nome: item.nome,
      descricao: item.descricao,
      donoId: item.donoId,
      torneioIds: item.torneioIds,
      tipo: item.tipo,
      criadoEm: new Date(item.criadoEm),
    });
  }
}
