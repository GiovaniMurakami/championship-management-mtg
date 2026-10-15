import { GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { FotoGaleria } from "../../../dominio/entidade/fotoGaleria";
import { EstatisticasGaleria, GaleriaGateway } from "../../../dominio/gateway/galeriaGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type FotoGaleriaItem = {
  id: string;
  url: string;
  urlThumb?: string;
  titulo?: string;
  criadoPorId: string;
  criadoEm: string;
};

const GALERIA_PK = "GALERIA";
const GALERIA_STATS_SK = "STATS";

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
      .filter((item) => Boolean(item?.id && item?.url))
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

  public async incrementarVisualizacoesPagina(): Promise<EstatisticasGaleria> {
    this.assertTabelaConfigurada();
    const resposta = await this.cliente.send(new UpdateItemCommand({
      TableName: this.tabela,
      Key: {
        pk: { S: GALERIA_PK },
        sk: { S: GALERIA_STATS_SK },
      },
      UpdateExpression:
        "SET visualizacoes = if_not_exists(visualizacoes, :zero) + :um, entity = if_not_exists(entity, :entity)",
      ExpressionAttributeValues: {
        ":zero": { N: "0" },
        ":um": { N: "1" },
        ":entity": { S: "GALERIA_STATS" },
      },
      ReturnValues: "UPDATED_NEW",
    }));
    return {
      visualizacoes: Number(resposta.Attributes?.visualizacoes?.N || 0),
    };
  }

  public async buscarEstatisticas(): Promise<EstatisticasGaleria> {
    this.assertTabelaConfigurada();
    const resposta = await this.cliente.send(new GetItemCommand({
      TableName: this.tabela,
      Key: {
        pk: { S: GALERIA_PK },
        sk: { S: GALERIA_STATS_SK },
      },
      ConsistentRead: true,
    }));
    return {
      visualizacoes: Number(resposta.Item?.visualizacoes?.N || 0),
    };
  }

  private fotoParaItem(foto: FotoGaleria): FotoGaleriaItem {
    return {
      id: foto.id,
      url: foto.url,
      urlThumb: foto.urlThumb || undefined,
      titulo: foto.titulo || undefined,
      criadoPorId: foto.criadoPorId,
      criadoEm: foto.criadoEm.toISOString(),
    };
  }

  private itemParaFoto(item: FotoGaleriaItem): FotoGaleria {
    return new FotoGaleria({
      id: item.id,
      url: item.url,
      urlThumb: item.urlThumb,
      titulo: item.titulo,
      criadoPorId: item.criadoPorId,
      criadoEm: new Date(item.criadoEm),
    });
  }
}
