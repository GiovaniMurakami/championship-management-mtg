import mongoose, { Document, Schema } from "mongoose";
import { StoryFundo } from "../../../dominio/entidade/storyFundo";
import { StoryFundoGateway } from "../../../dominio/gateway/storyFundoGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface StoryFundoDocument extends Document {
  id: string;
  nome: string;
  url: string;
  criadoEm: Date;
}

const storyFundoSchema = new Schema<StoryFundoDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true, maxlength: 100 },
  url: { type: String, required: true, maxlength: 500 },
  criadoEm: { type: Date, default: Date.now },
});

storyFundoSchema.index({ nome: 1 }, { unique: true });
storyFundoSchema.index({ criadoEm: -1 });

const StoryFundoModel =
  mongoose.models.StoryFundo ||
  mongoose.model<StoryFundoDocument>("StoryFundo", storyFundoSchema);

function docParaStoryFundo(doc: StoryFundoDocument): StoryFundo {
  return new StoryFundo({
    id: doc.get("id"),
    nome: doc.get("nome"),
    url: doc.get("url"),
    criadoEm: doc.get("criadoEm"),
  });
}

export class StoryFundoRepositorio extends BaseRepositorio implements StoryFundoGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new StoryFundoRepositorio();
  }

  public async salvar(fundo: StoryFundo): Promise<void> {
    await this.conectar();
    await StoryFundoModel.create({
      id: fundo.id,
      nome: fundo.nome,
      url: fundo.url,
      criadoEm: fundo.criadoEm,
    });
  }

  public async listar(): Promise<StoryFundo[]> {
    await this.conectar();
    const docs = await StoryFundoModel.find({}).sort({ nome: 1, id: 1 });
    return docs.map((doc) => docParaStoryFundo(doc as unknown as StoryFundoDocument));
  }

  public async buscarPorId(id: string): Promise<StoryFundo | null> {
    await this.conectar();
    const doc = await StoryFundoModel.findOne({ id });
    if (!doc) return null;
    return docParaStoryFundo(doc as unknown as StoryFundoDocument);
  }

  public async excluir(id: string): Promise<boolean> {
    await this.conectar();
    const result = await StoryFundoModel.deleteOne({ id });
    return result.deletedCount > 0;
  }
}
