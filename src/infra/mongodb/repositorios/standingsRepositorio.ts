import mongoose, { Schema, Document } from "mongoose";
import { Standings, StandingJogador } from "../../../dominio/entidade/standings";
import { StandingsGateway } from "../../../dominio/gateway/standingsGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface StandingsDocument extends Document {
  id: string;
  torneioId: string;
  rodada: number;
  totalInscritos: number;
  jogadores: StandingJogador[];
  criadoEm: Date;
  atualizadoEm: Date;
}

const standingJogadorSchema = new Schema(
  {
    posicao: { type: Number, required: true },
    usuario: {
      id: { type: String, required: true },
      nome: { type: String, required: true },
      resultadosExpressivos: { type: Number, required: true, default: 0 },
    },
    time: {
      type: {
        id: { type: String, required: true },
        nome: { type: String, required: true },
        imagemUrl: { type: String },
      },
      default: null,
    },
    pontosMesa: { type: Number, required: true },
    vitoriasPartida: { type: Number, required: true },
    empatesPartida: { type: Number, required: true },
    derrotasPartida: { type: Number, required: true },
    mwp: { type: Number, required: true },
    omwp: { type: Number, required: true },
    gwp: { type: Number, required: true },
    ogwp: { type: Number, required: true },
    checkInRodada: { type: Number, required: true },
    deckId: { type: String, default: null },
    deckNome: { type: String, default: null },
    dropped: { type: Boolean, required: true, default: false },
    resultadosExpressivos: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const standingsSchema = new Schema<StandingsDocument>({
  id: { type: String, required: true, unique: true },
  torneioId: { type: String, required: true },
  rodada: { type: Number, required: true },
  totalInscritos: { type: Number, required: true },
  jogadores: { type: [standingJogadorSchema], required: true, default: [] },
  criadoEm: { type: Date, required: true, default: Date.now },
  atualizadoEm: { type: Date, required: true, default: Date.now },
});

standingsSchema.index({ torneioId: 1, rodada: 1 }, { unique: true });
standingsSchema.index({ torneioId: 1, rodada: -1 });

export const StandingsModel =
  mongoose.models.Standings ||
  mongoose.model<StandingsDocument>("Standings", standingsSchema);

function leanParaStandings(doc: Record<string, unknown>): Standings {
  return new Standings({
    id: doc["id"] as string,
    torneioId: doc["torneioId"] as string,
    rodada: doc["rodada"] as number,
    totalInscritos: doc["totalInscritos"] as number,
    jogadores: (doc["jogadores"] as StandingJogador[]) ?? [],
    criadoEm: doc["criadoEm"] as Date,
    atualizadoEm: doc["atualizadoEm"] as Date,
  });
}

export class StandingsRepositorio extends BaseRepositorio implements StandingsGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new StandingsRepositorio();
  }

  public async salvarSnapshot(standings: Standings): Promise<Standings> {
    await this.conectar();
    const agora = new Date();
    const doc = await StandingsModel.findOneAndUpdate(
      { torneioId: standings.torneioId, rodada: standings.rodada },
      {
        $set: {
          totalInscritos: standings.totalInscritos,
          jogadores: standings.jogadores,
          atualizadoEm: agora,
        },
        $setOnInsert: {
          id: standings.id,
          torneioId: standings.torneioId,
          rodada: standings.rodada,
          criadoEm: standings.criadoEm,
        },
      },
      { upsert: true, new: true, lean: true }
    );

    return leanParaStandings(doc as unknown as Record<string, unknown>);
  }

  public async buscarPorTorneioERodada(
    torneioId: string,
    rodada: number
  ): Promise<Standings | null> {
    await this.conectar();
    const doc = await StandingsModel.findOne({ torneioId, rodada }).lean();
    return doc ? leanParaStandings(doc as unknown as Record<string, unknown>) : null;
  }

  public async buscarAtual(torneioId: string): Promise<Standings | null> {
    await this.conectar();
    const doc = await StandingsModel.findOne({ torneioId })
      .sort({ rodada: -1 })
      .lean();
    return doc ? leanParaStandings(doc as unknown as Record<string, unknown>) : null;
  }

  public async excluirPorTorneioERodada(
    torneioId: string,
    rodada: number
  ): Promise<number> {
    await this.conectar();
    const result = await StandingsModel.deleteOne({ torneioId, rodada });
    return result.deletedCount ?? 0;
  }

  public async excluirPorTorneio(torneioId: string): Promise<number> {
    await this.conectar();
    const result = await StandingsModel.deleteMany({ torneioId });
    return result.deletedCount ?? 0;
  }
}
