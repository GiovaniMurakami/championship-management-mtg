import mongoose, { Schema, Document } from "mongoose";
import { Time } from "../../../dominio/entidade/time";
import { TimeGateway } from "../../../dominio/gateway/timeGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface TimeDocument extends Document {
  id: string;
  nome: string;
  tag: string;
  donoId: string;
  membroIds: string[];
  fotoUrl?: string;
  criadoEm: Date;
}

const timeSchema = new Schema<TimeDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  tag: { type: String, required: true },
  donoId: { type: String, required: true },
  membroIds: { type: [String], default: [] },
  fotoUrl: { type: String },
  criadoEm: { type: Date, default: Date.now },
});

timeSchema.index({ criadoEm: -1 });

const TimeModel =
  mongoose.models.Time || mongoose.model<TimeDocument>("Time", timeSchema);

function docParaTime(doc: TimeDocument): Time {
  return new Time({
    id: doc.get("id"),
    nome: doc.get("nome"),
    tag: doc.get("tag"),
    donoId: doc.get("donoId"),
    membroIds: doc.get("membroIds") ?? [],
    fotoUrl: doc.get("fotoUrl") ?? undefined,
    criadoEm: doc.get("criadoEm"),
  });
}

export class TimeRepositorio extends BaseRepositorio implements TimeGateway {
  private constructor() { super(); }

  public static criar() {
    return new TimeRepositorio();
  }

  public async salvar(time: Time): Promise<void> {
    await this.conectar();
    await TimeModel.create({
      id: time.id,
      nome: time.nome,
      tag: time.tag,
      donoId: time.donoId,
      membroIds: time.membroIds,
      fotoUrl: time.fotoUrl,
      criadoEm: time.criadoEm,
    });
  }

  public async buscarPorId(id: string): Promise<Time | null> {
    await this.conectar();
    const doc = await TimeModel.findOne({ id });
    if (!doc) return null;
    return docParaTime(doc as unknown as TimeDocument);
  }

  public async listar(): Promise<Time[]> {
    await this.conectar();
    const docs = await TimeModel.find().sort({ criadoEm: -1 });
    return docs.map((doc) => docParaTime(doc as unknown as TimeDocument));
  }

  public async atualizar(time: Time): Promise<void> {
    await this.conectar();
    await TimeModel.updateOne(
      { id: time.id },
      {
        nome: time.nome,
        tag: time.tag,
        membroIds: time.membroIds,
        fotoUrl: time.fotoUrl,
      }
    );
  }

  public async excluir(id: string): Promise<void> {
    await this.conectar();
    await TimeModel.deleteOne({ id });
  }

  public async buscarPorMembro(usuarioId: string): Promise<Time[]> {
    await this.conectar();
    const docs = await TimeModel.find({ membroIds: usuarioId }).sort({ criadoEm: -1 });
    return docs.map((doc) => docParaTime(doc as unknown as TimeDocument));
  }
}
