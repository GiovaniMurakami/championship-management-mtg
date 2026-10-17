import { HallTop8 } from "../../../dominio/entidade/hallTop8";
import { HallTop8Gateway, HallTop8Item } from "../../../dominio/gateway/hallTop8Gateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type HallTop8Persistido = {
  id: string;
  torneioId: string;
  torneioNome?: string;
  imagemUrl: string;
  ativo: boolean;
  dataTorneio?: string;
  criadoEm: string;
};

const HALL_PK = "HALL_TOP8";

export class HallTop8DynamoRepositorio extends BaseDynamoRepositorio implements HallTop8Gateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new HallTop8DynamoRepositorio();
  }

  public async salvar(item: HallTop8Item): Promise<void> {
    const payload: HallTop8Persistido = {
      id: item.id,
      torneioId: item.torneioId,
      torneioNome: item.torneioNome || undefined,
      imagemUrl: item.imagemUrl,
      ativo: item.ativo !== false,
      dataTorneio: (item.dataTorneio || item.criadoEm).toISOString(),
      criadoEm: item.criadoEm.toISOString(),
    };
    await this.putJson(HALL_PK, `ITEM#${item.id}`, payload, { entity: "HALL_TOP8" });
  }

  public async listar(): Promise<HallTop8Item[]> {
    const itens = await this.queryJson<HallTop8Persistido>(HALL_PK, { consistente: false });
    return itens
      .filter((item) => Boolean(item?.id && item?.imagemUrl))
      .map((item) => this.itemParaDominio(item))
      .sort(
        (a, b) =>
          b.dataTorneio.getTime() - a.dataTorneio.getTime()
          || b.criadoEm.getTime() - a.criadoEm.getTime()
          || a.id.localeCompare(b.id),
      );
  }

  public async buscarPorId(id: string): Promise<HallTop8Item | null> {
    const item = await this.getJson<HallTop8Persistido>(HALL_PK, `ITEM#${id}`);
    return item ? this.itemParaDominio(item) : null;
  }

  public async excluir(id: string): Promise<boolean> {
    const existente = await this.buscarPorId(id);
    if (!existente) return false;
    await this.delete(HALL_PK, `ITEM#${id}`);
    return true;
  }

  private itemParaDominio(item: HallTop8Persistido): HallTop8Item {
    const criadoEm = new Date(item.criadoEm);
    const entidade = new HallTop8({
      id: item.id,
      torneioId: item.torneioId,
      torneioNome: item.torneioNome,
      imagemUrl: item.imagemUrl,
      ativo: item.ativo !== false,
      dataTorneio: item.dataTorneio ? new Date(item.dataTorneio) : criadoEm,
      criadoEm,
    });
    return {
      id: entidade.id,
      torneioId: entidade.torneioId,
      torneioNome: entidade.torneioNome,
      imagemUrl: entidade.imagemUrl,
      ativo: entidade.ativo,
      dataTorneio: entidade.dataTorneio,
      criadoEm: entidade.criadoEm,
    };
  }
}
