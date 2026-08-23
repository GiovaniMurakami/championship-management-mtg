import { StoryFundo } from "../../../dominio/entidade/storyFundo";
import { StoryFundoGateway } from "../../../dominio/gateway/storyFundoGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type StoryFundoItem = {
  id: string;
  nome: string;
  url: string;
  textoRodape?: "claro" | "escuro";
  criadoEm: string;
};

const STORY_PK = "STORY_FUNDO";

export class StoryFundoDynamoRepositorio extends BaseDynamoRepositorio implements StoryFundoGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new StoryFundoDynamoRepositorio();
  }

  public async salvar(fundo: StoryFundo): Promise<void> {
    await this.putJson<StoryFundoItem>(
      STORY_PK,
      `ITEM#${fundo.id}`,
      this.fundoParaItem(fundo),
      { entity: "STORY_FUNDO" }
    );
  }

  public async listar(): Promise<StoryFundo[]> {
    const itens = await this.queryJson<StoryFundoItem>(STORY_PK);
    return itens
      .map((item) => this.itemParaFundo(item))
      .sort((a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id));
  }

  public async buscarPorId(id: string): Promise<StoryFundo | null> {
    const item = await this.getJson<StoryFundoItem>(STORY_PK, `ITEM#${id}`);
    return item ? this.itemParaFundo(item) : null;
  }

  public async excluir(id: string): Promise<boolean> {
    const existente = await this.buscarPorId(id);
    if (!existente) return false;
    await this.delete(STORY_PK, `ITEM#${id}`);
    return true;
  }

  private fundoParaItem(fundo: StoryFundo): StoryFundoItem {
    return {
      id: fundo.id,
      nome: fundo.nome,
      url: fundo.url,
      textoRodape: fundo.textoRodape,
      criadoEm: fundo.criadoEm.toISOString(),
    };
  }

  private itemParaFundo(item: StoryFundoItem): StoryFundo {
    return new StoryFundo({
      id: item.id,
      nome: item.nome,
      url: item.url,
      textoRodape: item.textoRodape,
      criadoEm: new Date(item.criadoEm),
    });
  }
}
