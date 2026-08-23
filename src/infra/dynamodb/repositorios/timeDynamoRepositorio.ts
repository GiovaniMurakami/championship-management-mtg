import { Time } from "../../../dominio/entidade/time";
import { FiltrosListarTimes, TimeGateway } from "../../../dominio/gateway/timeGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type TimeItem = {
  id: string;
  nome: string;
  descricao?: string;
  imagemUrl?: string;
  donoId: string;
  membroIds: string[];
  solicitacoesPendentes: string[];
  conviteToken?: string;
  criadoEm: string;
};

type ConviteIndex = {
  timeId: string;
  token: string;
};

const TIMES_PK = "TIMES";

export class TimeDynamoRepositorio extends BaseDynamoRepositorio implements TimeGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new TimeDynamoRepositorio();
  }

  public async salvar(time: Time): Promise<void> {
    await this.salvarIndices(this.timeParaItem(time));
  }

  public async buscarPorId(id: string): Promise<Time | null> {
    const item = await this.getJson<TimeItem>(`TIME#${id}`, "DATA");
    return item ? this.itemParaTime(item) : null;
  }

  public async buscarVarios(ids: string[]): Promise<Time[]> {
    const times = await Promise.all(Array.from(new Set(ids)).map((id) => this.buscarPorId(id)));
    return times.filter((time): time is Time => time !== null);
  }

  public async buscarPorMembros(usuarioIds: string[]): Promise<Time[]> {
    const listas = await Promise.all(Array.from(new Set(usuarioIds)).map((id) => this.queryJson<TimeItem>(`MEMBRO#${id}`)));
    const porId = new Map<string, TimeItem>();
    for (const item of listas.flat()) porId.set(item.id, item);
    return Array.from(porId.values()).map((item) => this.itemParaTime(item));
  }

  public async buscarPorConviteToken(token: string): Promise<Time | null> {
    const indice = await this.getJson<ConviteIndex>(`TIME_CONVITE#${token}`, "DATA");
    return indice ? this.buscarPorId(indice.timeId) : null;
  }

  public async listar(filtros: FiltrosListarTimes = {}): Promise<Time[]> {
    const base = filtros.membroId
      ? await this.queryJson<TimeItem>(`MEMBRO#${filtros.membroId}`)
      : await this.queryJson<TimeItem>(TIMES_PK);
    const filtrados = this.filtrar(base, filtros)
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime() || a.id.localeCompare(b.id));
    const offset = filtros.offset ?? 0;
    const limite = filtros.limite ?? filtrados.length;
    return filtrados.slice(offset, offset + limite).map((item) => this.itemParaTime(item));
  }

  public async listarTotal(filtros: Pick<FiltrosListarTimes, "nome" | "membroId"> = {}): Promise<number> {
    const base = filtros.membroId
      ? await this.queryJson<TimeItem>(`MEMBRO#${filtros.membroId}`)
      : await this.queryJson<TimeItem>(TIMES_PK);
    return this.filtrar(base, filtros).length;
  }

  public async atualizar(time: Time): Promise<void> {
    const anterior = await this.buscarPorId(time.id);
    const atual = this.timeParaItem(time);
    const requests = this.requestsSalvarIndices(atual);
    if (anterior) {
      const antigo = this.timeParaItem(anterior);
      if (this.skTime(antigo) !== this.skTime(atual)) requests.push(this.toDeleteRequest(TIMES_PK, this.skTime(antigo)));
      for (const membroId of antigo.membroIds.filter((id) => !atual.membroIds.includes(id))) {
        requests.push(this.toDeleteRequest(`MEMBRO#${membroId}`, `TIME#${antigo.id}`));
      }
      if (antigo.conviteToken && antigo.conviteToken !== atual.conviteToken) {
        requests.push(this.toDeleteRequest(`TIME_CONVITE#${antigo.conviteToken}`, "DATA"));
      }
    }
    await this.transactWriteRequests(requests);
  }

  public async excluir(id: string): Promise<void> {
    const time = await this.buscarPorId(id);
    if (!time) return;
    await this.removerIndices(this.timeParaItem(time));
  }

  private filtrar(itens: TimeItem[], filtros: Pick<FiltrosListarTimes, "nome">): TimeItem[] {
    const nome = filtros.nome?.trim().toLowerCase();
    return itens.filter((item) => !nome || item.nome.toLowerCase().includes(nome));
  }

  private async salvarIndices(item: TimeItem): Promise<void> {
    await this.transactWriteRequests(this.requestsSalvarIndices(item));
  }

  private requestsSalvarIndices(item: TimeItem) {
    const requests = [
      this.toPutRequest(`TIME#${item.id}`, "DATA", item, { entity: "TIME" }),
      this.toPutRequest(TIMES_PK, this.skTime(item), item, { entity: "TIME_INDEX" }),
    ];
    for (const membroId of item.membroIds) {
      requests.push(this.toPutRequest(`MEMBRO#${membroId}`, `TIME#${item.id}`, item, { entity: "TIME_MEMBRO" }));
    }
    if (item.conviteToken) {
      requests.push(this.toPutRequest(`TIME_CONVITE#${item.conviteToken}`, "DATA", { timeId: item.id, token: item.conviteToken }, { entity: "TIME_CONVITE" }));
    }
    return requests;
  }

  private async removerIndices(item: TimeItem): Promise<void> {
    const requests = [
      this.toDeleteRequest(`TIME#${item.id}`, "DATA"),
      this.toDeleteRequest(TIMES_PK, this.skTime(item)),
    ];
    for (const membroId of item.membroIds) {
      requests.push(this.toDeleteRequest(`MEMBRO#${membroId}`, `TIME#${item.id}`));
    }
    if (item.conviteToken) {
      requests.push(this.toDeleteRequest(`TIME_CONVITE#${item.conviteToken}`, "DATA"));
    }
    await this.transactWriteRequests(requests);
  }

  private skTime(item: TimeItem): string {
    return `TIME#${item.criadoEm}#${item.id}`;
  }

  private timeParaItem(time: Time): TimeItem {
    return {
      id: time.id,
      nome: time.nome,
      descricao: time.descricao,
      imagemUrl: time.imagemUrl,
      donoId: time.donoId,
      membroIds: time.membroIds,
      solicitacoesPendentes: time.solicitacoesPendentes,
      conviteToken: time.conviteToken,
      criadoEm: time.criadoEm.toISOString(),
    };
  }

  private itemParaTime(item: TimeItem): Time {
    return new Time({
      id: item.id,
      nome: item.nome,
      descricao: item.descricao,
      imagemUrl: item.imagemUrl,
      donoId: item.donoId,
      membroIds: item.membroIds,
      solicitacoesPendentes: item.solicitacoesPendentes,
      conviteToken: item.conviteToken,
      criadoEm: new Date(item.criadoEm),
    });
  }
}
