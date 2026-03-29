import mongoose, { Schema, Document } from "mongoose";
import { Liga } from "../../../dominio/entidade/liga";
import { LigaGateway } from "../../../dominio/gateway/ligaGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface LigaDocument extends Document {
  id: string;
  nome: string;
  descricao?: string;
  donoId: string;
  torneioIds: string[];
  criadoEm: Date;
}

const ligaSchema = new Schema<LigaDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  descricao: { type: String },
  donoId: { type: String, required: true },
  torneioIds: { type: [String], default: [] },
  criadoEm: { type: Date, default: Date.now },
});

const LigaModel =
  mongoose.models.Liga || mongoose.model<LigaDocument>("Liga", ligaSchema);

function docParaLiga(doc: LigaDocument): Liga {
  return new Liga({
    id: doc.get("id"),
    nome: doc.get("nome"),
    descricao: doc.get("descricao") ?? undefined,
    donoId: doc.get("donoId"),
    torneioIds: doc.get("torneioIds") ?? [],
    criadoEm: doc.get("criadoEm"),
  });
}

export class LigaRepositorio extends BaseRepositorio implements LigaGateway {
  private constructor() { super(); }

  public static criar() {
    return new LigaRepositorio();
  }

  public async salvar(liga: Liga): Promise<void> {
    await this.conectar();
    await LigaModel.create({
      id: liga.id,
      nome: liga.nome,
      descricao: liga.descricao,
      donoId: liga.donoId,
      torneioIds: liga.torneioIds,
      criadoEm: liga.criadoEm,
    });
  }

  public async buscarPorId(id: string): Promise<Liga | null> {
    await this.conectar();
    const doc = await LigaModel.findOne({ id });
    if (!doc) return null;
    return docParaLiga(doc as unknown as LigaDocument);
  }

  public async listar(): Promise<Liga[]> {
    await this.conectar();
    const docs = await LigaModel.find().sort({ criadoEm: -1 });
    return docs.map((doc) => docParaLiga(doc as unknown as LigaDocument));
  }

  public async atualizar(liga: Liga): Promise<void> {
    await this.conectar();
    await LigaModel.updateOne(
      { id: liga.id },
      {
        nome: liga.nome,
        descricao: liga.descricao,
        torneioIds: liga.torneioIds,
      }
    );
  }

  public async excluir(id: string): Promise<void> {
    await this.conectar();
    await LigaModel.deleteOne({ id });
  }
}
