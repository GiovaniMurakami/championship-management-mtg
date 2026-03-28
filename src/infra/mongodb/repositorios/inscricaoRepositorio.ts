import mongoose, { Schema, Document } from "mongoose";
import { Inscricao } from "../../../dominio/entidade/inscricao";
import { InscricaoGateway } from "../../../dominio/gateway/inscricaoGateway";
import { conectarMongoDB } from "../conexao";

interface InscricaoDocument extends Document {
  id: string;
  torneioId: string;
  usuarioId: string;
  deckId?: string;
  checkIn: boolean;
  checkInRodada: number;
  dropped: boolean;
  criadoEm: Date;
}

const inscricaoSchema = new Schema<InscricaoDocument>({
  id: { type: String, required: true, unique: true },
  torneioId: { type: String, required: true },
  usuarioId: { type: String, required: true },
  deckId: { type: String },
  checkIn: { type: Boolean, required: true, default: false },
  checkInRodada: { type: Number, required: true, default: -1 },
  dropped: { type: Boolean, required: true, default: false },
  criadoEm: { type: Date, default: Date.now },
});

const InscricaoModel =
  mongoose.models.Inscricao ||
  mongoose.model<InscricaoDocument>("Inscricao", inscricaoSchema);

function docParaInscricao(doc: InscricaoDocument): Inscricao {
  return new Inscricao({
    id: doc.get("id"),
    torneioId: doc.get("torneioId"),
    usuarioId: doc.get("usuarioId"),
    deckId: doc.get("deckId"),
    checkIn: doc.get("checkIn"),
    checkInRodada: doc.get("checkInRodada") ?? -1,
    dropped: doc.get("dropped") ?? false,
    criadoEm: doc.get("criadoEm"),
  });
}

export class InscricaoRepositorio implements InscricaoGateway {
  private constructor() {}

  public static criar() {
    return new InscricaoRepositorio();
  }

  public async salvar(inscricao: Inscricao): Promise<void> {
    await conectarMongoDB();
    await InscricaoModel.create({
      id: inscricao.id,
      torneioId: inscricao.torneioId,
      usuarioId: inscricao.usuarioId,
      deckId: inscricao.deckId,
      checkIn: inscricao.checkIn,
      checkInRodada: inscricao.checkInRodada,
      dropped: inscricao.dropped,
      criadoEm: inscricao.criadoEm,
    });
  }

  public async buscarPorTorneioEUsuario(
    torneioId: string,
    usuarioId: string
  ): Promise<Inscricao | null> {
    await conectarMongoDB();
    const doc = await InscricaoModel.findOne({ torneioId, usuarioId });
    if (!doc) return null;
    return docParaInscricao(doc as unknown as InscricaoDocument);
  }

  public async listarPorTorneio(torneioId: string): Promise<Inscricao[]> {
    await conectarMongoDB();
    const docs = await InscricaoModel.find({ torneioId });
    return docs.map((doc) =>
      docParaInscricao(doc as unknown as InscricaoDocument)
    );
  }

  public async listarPorUsuario(usuarioId: string): Promise<Inscricao[]> {
    await conectarMongoDB();
    const docs = await InscricaoModel.find({ usuarioId });
    return docs.map((doc) =>
      docParaInscricao(doc as unknown as InscricaoDocument)
    );
  }

  public async atualizar(inscricao: Inscricao): Promise<void> {
    await conectarMongoDB();
    await InscricaoModel.updateOne(
      { id: inscricao.id },
      {
        deckId: inscricao.deckId,
        checkIn: inscricao.checkIn,
        checkInRodada: inscricao.checkInRodada,
        dropped: inscricao.dropped,
      }
    );
  }

  public async contarPorTorneios(torneioIds: string[]): Promise<Record<string, number>> {
    await conectarMongoDB();
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
}
