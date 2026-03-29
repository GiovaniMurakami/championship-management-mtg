import mongoose, { Schema, Document } from "mongoose";
import { Torneio, StatusTorneio } from "../../../dominio/entidade/torneio";
import { FiltrosListarTorneios, TorneioGateway } from "../../../dominio/gateway/torneioGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface TorneioDocument extends Document {
  id: string;
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
  status: StatusTorneio;
  rodadaAtual: number;
  totalRodadas: number;
  premio?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  linkLive?: string;
  emCorte: boolean;
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
  premio: { type: String },
  bannerUrl: { type: String },
  linkBanner: { type: String },
  somRodada: { type: String },
  maxJogadores: { type: Number },
  maxRodadas: { type: Number },
  corteTop: { type: Number },
  linkLive: { type: String },
  emCorte: { type: Boolean, default: false },
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
    premio: doc.get("premio") ?? undefined,
    bannerUrl: doc.get("bannerUrl") ?? undefined,
    linkBanner: doc.get("linkBanner") ?? undefined,
    somRodada: doc.get("somRodada") ?? undefined,
    maxJogadores: doc.get("maxJogadores") ?? undefined,
    maxRodadas: doc.get("maxRodadas") ?? undefined,
    corteTop: doc.get("corteTop") ?? undefined,
    linkLive: doc.get("linkLive") ?? undefined,
    emCorte: doc.get("emCorte") ?? false,
    criadoEm: doc.get("criadoEm"),
  });
}

export class TorneioRepositorio extends BaseRepositorio implements TorneioGateway {
  private constructor() { super(); }

  public static criar() {
    return new TorneioRepositorio();
  }

  public async salvar(torneio: Torneio): Promise<void> {
    await this.conectar();
    await TorneioModel.create({
      id: torneio.id,
      nome: torneio.nome,
      horario: torneio.horario,
      formato: torneio.formato,
      donoId: torneio.donoId,
      status: torneio.status,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
      premio: torneio.premio,
      bannerUrl: torneio.bannerUrl,
      linkBanner: torneio.linkBanner,
      somRodada: torneio.somRodada,
      maxJogadores: torneio.maxJogadores,
      maxRodadas: torneio.maxRodadas,
      corteTop: torneio.corteTop,
      linkLive: torneio.linkLive,
      emCorte: torneio.emCorte,
      criadoEm: torneio.criadoEm,
    });
  }

  public async buscarPorId(id: string): Promise<Torneio | null> {
    await this.conectar();
    const doc = await TorneioModel.findOne({ id });
    if (!doc) return null;
    return docParaTorneio(doc as unknown as TorneioDocument);
  }

  public async listar(filtros: FiltrosListarTorneios = {}): Promise<Torneio[]> {
    await this.conectar();
    let query = TorneioModel.find().sort({ criadoEm: -1 });
    if (filtros.offset !== undefined) query = query.skip(filtros.offset);
    if (filtros.limite !== undefined) query = query.limit(filtros.limite);
    const docs = await query;
    return docs.map((doc) => docParaTorneio(doc as unknown as TorneioDocument));
  }

  public async listarTotal(): Promise<number> {
    await this.conectar();
    return TorneioModel.countDocuments();
  }

  public async atualizar(torneio: Torneio): Promise<void> {
    await this.conectar();
    await TorneioModel.updateOne(
      { id: torneio.id },
      {
        nome: torneio.nome,
        horario: torneio.horario,
        formato: torneio.formato,
        status: torneio.status,
        rodadaAtual: torneio.rodadaAtual,
        totalRodadas: torneio.totalRodadas,
        premio: torneio.premio,
        bannerUrl: torneio.bannerUrl,
        linkBanner: torneio.linkBanner,
        somRodada: torneio.somRodada,
        maxJogadores: torneio.maxJogadores,
        maxRodadas: torneio.maxRodadas,
        corteTop: torneio.corteTop,
        linkLive: torneio.linkLive,
        emCorte: torneio.emCorte,
      }
    );
  }
}
