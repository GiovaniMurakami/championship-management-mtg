import mongoose, { Schema, Document } from "mongoose";
import { Torneio, StatusTorneio } from "../../../dominio/entidade/torneio";
import { TorneioGateway } from "../../../dominio/gateway/torneioGateway";
import { conectarMongoDB } from "../conexao";

interface TorneioDocument extends Document {
  id: string;
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
  status: StatusTorneio;
  rodadaAtual: number;
  totalRodadas: number;
  criadoEm: Date;
}

const torneioSchema = new Schema<TorneioDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  horario: { type: Date, required: true },
  formato: { type: String, required: true },
  donoId: { type: String, required: true },
  status: { type: String, required: true, default: "inscricoes_abertas" },
  rodadaAtual: { type: Number, required: true, default: 0 },
  totalRodadas: { type: Number, required: true, default: 0 },
  criadoEm: { type: Date, default: Date.now },
});

const TorneioModel =
  mongoose.models.Torneio ||
  mongoose.model<TorneioDocument>("Torneio", torneioSchema);

function docParaTorneio(doc: TorneioDocument): Torneio {
  return new Torneio({
    id: doc.get("id"),
    nome: doc.get("nome"),
    horario: doc.get("horario"),
    formato: doc.get("formato"),
    donoId: doc.get("donoId"),
    status: doc.get("status"),
    rodadaAtual: doc.get("rodadaAtual"),
    totalRodadas: doc.get("totalRodadas"),
    criadoEm: doc.get("criadoEm"),
  });
}

export class TorneioRepositorio implements TorneioGateway {
  private constructor() {}

  public static criar() {
    return new TorneioRepositorio();
  }

  public async salvar(torneio: Torneio): Promise<void> {
    await conectarMongoDB();
    await TorneioModel.create({
      id: torneio.id,
      nome: torneio.nome,
      horario: torneio.horario,
      formato: torneio.formato,
      donoId: torneio.donoId,
      status: torneio.status,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
      criadoEm: torneio.criadoEm,
    });
  }

  public async buscarPorId(id: string): Promise<Torneio | null> {
    await conectarMongoDB();
    const doc = await TorneioModel.findOne({ id });
    if (!doc) return null;
    return docParaTorneio(doc as unknown as TorneioDocument);
  }

  public async listar(): Promise<Torneio[]> {
    await conectarMongoDB();
    const docs = await TorneioModel.find().sort({ criadoEm: -1 });
    return docs.map((doc) => docParaTorneio(doc as unknown as TorneioDocument));
  }

  public async atualizar(torneio: Torneio): Promise<void> {
    await conectarMongoDB();
    await TorneioModel.updateOne(
      { id: torneio.id },
      {
        nome: torneio.nome,
        horario: torneio.horario,
        formato: torneio.formato,
        status: torneio.status,
        rodadaAtual: torneio.rodadaAtual,
        totalRodadas: torneio.totalRodadas,
      }
    );
  }
}
