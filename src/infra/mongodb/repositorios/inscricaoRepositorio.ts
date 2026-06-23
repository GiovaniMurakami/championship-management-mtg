import mongoose, { Schema, Document } from "mongoose";
import { Inscricao } from "../../../dominio/entidade/inscricao";
import { InscricaoGateway } from "../../../dominio/gateway/inscricaoGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface InscricaoDocument extends Document {
  id: string;
  torneioId: string;
  usuarioId: string;
  deckId?: string;
  timeId?: string;
  checkInRodada: number;
  dropped: boolean;
  byeCount: number;
  criadoEm: Date;
}

const inscricaoSchema = new Schema<InscricaoDocument>({
  id: { type: String, required: true, unique: true },
  torneioId: { type: String, required: true },
  usuarioId: { type: String, required: true },
  deckId: { type: String },
  timeId: { type: String },
  checkInRodada: { type: Number, required: true, default: -1 },
  dropped: { type: Boolean, required: true, default: false },
  byeCount: { type: Number, required: true, default: 0 },
  criadoEm: { type: Date, default: Date.now },
});

inscricaoSchema.index({ torneioId: 1, usuarioId: 1 }, { unique: true });
inscricaoSchema.index({ torneioId: 1 });
inscricaoSchema.index({ usuarioId: 1 });
inscricaoSchema.index({ torneioId: 1, dropped: 1 });
inscricaoSchema.index({ torneioId: 1, timeId: 1 });

const InscricaoModel =
  mongoose.models.Inscricao ||
  mongoose.model<InscricaoDocument>("Inscricao", inscricaoSchema);

function docParaInscricao(doc: InscricaoDocument): Inscricao {
  return new Inscricao({
    id: doc.get("id"),
    torneioId: doc.get("torneioId"),
    usuarioId: doc.get("usuarioId"),
    deckId: doc.get("deckId"),
    timeId: doc.get("timeId") ?? undefined,
    checkInRodada: doc.get("checkInRodada") ?? -1,
    dropped: doc.get("dropped") ?? false,
    byeCount: doc.get("byeCount") ?? 0,
    criadoEm: doc.get("criadoEm"),
  });
}

export class InscricaoRepositorio extends BaseRepositorio implements InscricaoGateway {
  private constructor() { super(); }

  public static criar() {
    return new InscricaoRepositorio();
  }

  public async salvar(inscricao: Inscricao): Promise<void> {
    await this.conectar();
    await InscricaoModel.create({
      id: inscricao.id,
      torneioId: inscricao.torneioId,
      usuarioId: inscricao.usuarioId,
      deckId: inscricao.deckId,
      timeId: inscricao.timeId,
      checkInRodada: inscricao.checkInRodada,
      dropped: inscricao.dropped,
      byeCount: inscricao.byeCount,
      criadoEm: inscricao.criadoEm,
    });
  }

  public async buscarPorTorneioEUsuario(
    torneioId: string,
    usuarioId: string
  ): Promise<Inscricao | null> {
    await this.conectar();
    const doc = await InscricaoModel.findOne({ torneioId, usuarioId });
    if (!doc) return null;
    return docParaInscricao(doc as unknown as InscricaoDocument);
  }

  public async listarPorTorneio(torneioId: string): Promise<Inscricao[]> {
    await this.conectar();
    const docs = await InscricaoModel.find({ torneioId });
    return docs.map((doc) =>
      docParaInscricao(doc as unknown as InscricaoDocument)
    );
  }

  public async listarPorTorneios(torneioIds: string[]): Promise<Inscricao[]> {
    if (torneioIds.length === 0) return [];
    await this.conectar();
    const docs = await InscricaoModel.find({ torneioId: { $in: torneioIds } });
    return docs.map((doc) =>
      docParaInscricao(doc as unknown as InscricaoDocument)
    );
  }

  public async listarPorUsuario(usuarioId: string): Promise<Inscricao[]> {
    await this.conectar();
    const docs = await InscricaoModel.find({ usuarioId });
    return docs.map((doc) =>
      docParaInscricao(doc as unknown as InscricaoDocument)
    );
  }

  public async atualizar(inscricao: Inscricao): Promise<void> {
    await this.conectar();
    await InscricaoModel.updateOne(
      { id: inscricao.id },
      {
        deckId: inscricao.deckId,
        timeId: inscricao.timeId,
        checkInRodada: inscricao.checkInRodada,
        dropped: inscricao.dropped,
        byeCount: inscricao.byeCount,
      }
    );
  }

  public async contarPorTorneios(torneioIds: string[]): Promise<Record<string, number>> {
    await this.conectar();
    const resultado = await InscricaoModel.aggregate<{ _id: string; total: number }>([
      { $match: { torneioId: { $in: torneioIds } } },
      { $group: { _id: "$torneioId", total: { $sum: 1 } } },
    ]);
    const mapa: Record<string, number> = {};
    for (const item of resultado) {
      mapa[item._id] = item.total;
    }
    return mapa;
  }

  public async excluir(id: string): Promise<void> {
    await this.conectar();
    await InscricaoModel.deleteOne({ id });
  }
}
