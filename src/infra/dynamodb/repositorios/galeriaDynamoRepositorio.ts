import { FotoGaleria } from "../../../dominio/entidade/fotoGaleria";
import { GaleriaGateway } from "../../../dominio/gateway/galeriaGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type FotoGaleriaItem = {
  id: string;
  url: string;
  titulo?: string;
  criadoPorId: string;
  criadoEm: string;
};

const GALERIA_PK = "GALERIA";

export class GaleriaDynamoRepositorio extends BaseDynamoRepositorio implements GaleriaGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new GaleriaDynamoRepositorio();
  }

  public async salvar(foto: FotoGaleria): Promise<void> {
    await this.putJson<FotoGaleriaItem>(
      GALERIA_PK,
      `ITEM#${foto.id}`,
      this.fotoParaItem(foto),
      { entity: "GALERIA" }
    );
  }

  public async listar(): Promise<FotoGaleria[]> {
    const itens = await this.queryJson<FotoGaleriaItem>(GALERIA_PK, { consistente: false });
    return itens
      .map((item) => this.itemParaFoto(item))
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime() || a.id.localeCompare(b.id));
  }

  public async buscarPorId(id: string): Promise<FotoGaleria | null> {
    const item = await this.getJson<FotoGaleriaItem>(GALERIA_PK, `ITEM#${id}`);
    return item ? this.itemParaFoto(item) : null;
  }

  public async excluir(id: string): Promise<boolean> {
    const existente = await this.buscarPorId(id);
    if (!existente) return false;
    await this.delete(GALERIA_PK, `ITEM#${id}`);
    return true;
  }

  private fotoParaItem(foto: FotoGaleria): FotoGaleriaItem {
    return {
      id: foto.id,
      url: foto.url,
      titulo: foto.titulo || undefined,
      criadoPorId: foto.criadoPorId,
      criadoEm: foto.criadoEm.toISOString(),
    };
  }

  private itemParaFoto(item: FotoGaleriaItem): FotoGaleria {
    return new FotoGaleria({
      id: item.id,
      url: item.url,
      titulo: item.titulo,
      criadoPorId: item.criadoPorId,
      criadoEm: new Date(item.criadoEm),
    });
  }
}
