import mongoose, { Schema, Document } from "mongoose";
import { Torneio, StatusTorneio } from "../../../dominio/entidade/torneio";
import { Partida } from "../../../dominio/entidade/partida";
import { FiltrosListarTorneios, TorneioGateway } from "../../../dominio/gateway/torneioGateway";
import { BaseRepositorio } from "./baseRepositorio";
import { PartidaModel } from "./partidaRepositorio";

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
  secreto: boolean;
  criadoEm: Date;
}

const torneioSchema = new Schema<TorneioDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true, maxlength: 100 },
  horario: { type: Date, required: true },
  formato: { type: String, required: true, maxlength: 50 },
  donoId: { type: String, required: true },
  status: { type: String, required: true, default: "inscricoes_abertas" },
  rodadaAtual: { type: Number, required: true, default: 0 },
  totalRodadas: { type: Number, required: true, default: 0 },
  premio: { type: String, maxlength: 200 },
  bannerUrl: { type: String, maxlength: 500 },
  linkBanner: { type: String, maxlength: 500 },
  somRodada: { type: String, maxlength: 500 },
  maxJogadores: { type: Number, max: 512 },
  maxRodadas: { type: Number, max: 20 },
  corteTop: { type: Number, max: 64 },
  linkLive: { type: String, maxlength: 500 },
  emCorte: { type: Boolean, default: false },
  secreto: { type: Boolean, default: false },
  criadoEm: { type: Date, default: Date.now },
});

torneioSchema.index({ criadoEm: -1 });
torneioSchema.index({ donoId: 1 });
torneioSchema.index({ status: 1, criadoEm: -1 });

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
    secreto: doc.get("secreto") ?? false,
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
      secreto: torneio.secreto,
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
    const filtroQuery: Record<string, unknown> = {};
    if (!filtros.incluirSecretos) filtroQuery.secreto = { $ne: true };
    let query = TorneioModel.find(filtroQuery).sort({ criadoEm: -1 });
    if (filtros.offset !== undefined) query = query.skip(filtros.offset);
    if (filtros.limite !== undefined) query = query.limit(filtros.limite);
    const docs = await query;
    return docs.map((doc) => docParaTorneio(doc as unknown as TorneioDocument));
  }

  public async listarTotal(filtros: Pick<FiltrosListarTorneios, 'incluirSecretos'> = {}): Promise<number> {
    await this.conectar();
    const filtroQuery: Record<string, unknown> = {};
    if (!filtros.incluirSecretos) filtroQuery.secreto = { $ne: true };
    return TorneioModel.countDocuments(filtroQuery);
  }

  public async excluir(id: string): Promise<void> {
    await this.conectar();
    await TorneioModel.deleteOne({ id });
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
        secreto: torneio.secreto,
      }
    );
  }

  /**
   * Atualiza o torneio e insere novas partidas numa única transação MongoDB.
   * Evita estado parcial (torneio avançado de rodada mas partidas não criadas).
   */
  public async atualizarECriarPartidas(
    torneio: Torneio,
    partidas: Partida[]
  ): Promise<void> {
    await this.conectar();
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await TorneioModel.updateOne(
        { id: torneio.id },
        {
          status: torneio.status,
          rodadaAtual: torneio.rodadaAtual,
          totalRodadas: torneio.totalRodadas,
          emCorte: torneio.emCorte,
        },
        { session }
      );

      if (partidas.length > 0) {
        await PartidaModel.insertMany(
          partidas.map((p) => ({
            id: p.id,
            torneioId: p.torneioId,
            rodada: p.rodada,
            jogador1Id: p.jogador1Id,
            jogador2Id: p.jogador2Id,
            deckJogador1Id: p.deckJogador1Id,
            deckJogador2Id: p.deckJogador2Id,
            vitoriasJogador1: p.vitoriasJogador1,
            vitoriasJogador2: p.vitoriasJogador2,
            status: p.status,
            criadoEm: p.criadoEm,
          })),
          { session }
        );
      }

      await session.commitTransaction();
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      await session.endSession();
    }
  }
}
