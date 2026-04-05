import mongoose, { Schema, Document } from "mongoose";
import { Partida, StatusPartida } from "../../../dominio/entidade/partida";
import { PartidaGateway } from "../../../dominio/gateway/partidaGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface PartidaDocument extends Document {
  id: string;
  torneioId: string;
  rodada: number;
  jogador1Id: string;
  jogador2Id: string | null;
  deckJogador1Id?: string;
  deckJogador2Id?: string | null;
  vitoriasJogador1: number;
  vitoriasJogador2: number;
  status: StatusPartida;
  contestado: boolean;
  criadoEm: Date;
}

const partidaSchema = new Schema<PartidaDocument>({
  id: { type: String, required: true, unique: true },
  torneioId: { type: String, required: true },
  rodada: { type: Number, required: true, max: 30 },
  jogador1Id: { type: String, required: true },
  jogador2Id: { type: String, default: null },
  deckJogador1Id: { type: String },
  deckJogador2Id: { type: String },
  vitoriasJogador1: { type: Number, required: true, default: 0, max: 3 },
  vitoriasJogador2: { type: Number, required: true, default: 0, max: 3 },
  status: { type: String, required: true, default: "pendente" },
  contestado: { type: Boolean, default: false },
  criadoEm: { type: Date, default: Date.now },
});

partidaSchema.index({ torneioId: 1 });
partidaSchema.index({ torneioId: 1, rodada: 1 });

// Exportado para uso em transações compostas (ex: TorneioRepositorio)
export const PartidaModel =
  mongoose.models.Partida ||
  mongoose.model<PartidaDocument>("Partida", partidaSchema);

function docParaPartida(doc: PartidaDocument): Partida {
  return new Partida({
    id: doc.get("id"),
    torneioId: doc.get("torneioId"),
    rodada: doc.get("rodada"),
    jogador1Id: doc.get("jogador1Id"),
    jogador2Id: doc.get("jogador2Id"),
    deckJogador1Id: doc.get("deckJogador1Id") ?? undefined,
    deckJogador2Id: doc.get("deckJogador2Id") ?? undefined,
    vitoriasJogador1: doc.get("vitoriasJogador1"),
    vitoriasJogador2: doc.get("vitoriasJogador2"),
    status: doc.get("status"),
    contestado: doc.get("contestado") ?? false,
    criadoEm: doc.get("criadoEm"),
  });
}

// Mapper para documentos lean (retorno de .lean())
function leanParaPartida(doc: Record<string, unknown>): Partida {
  return new Partida({
    id: doc["id"] as string,
    torneioId: doc["torneioId"] as string,
    rodada: doc["rodada"] as number,
    jogador1Id: doc["jogador1Id"] as string,
    jogador2Id: (doc["jogador2Id"] as string | null) ?? null,
    deckJogador1Id: (doc["deckJogador1Id"] as string | undefined) ?? undefined,
    deckJogador2Id: (doc["deckJogador2Id"] as string | null | undefined) ?? undefined,
    vitoriasJogador1: doc["vitoriasJogador1"] as number,
    vitoriasJogador2: doc["vitoriasJogador2"] as number,
    status: doc["status"] as StatusPartida,
    contestado: (doc["contestado"] as boolean | undefined) ?? false,
    criadoEm: doc["criadoEm"] as Date,
  });
}

export class PartidaRepositorio extends BaseRepositorio implements PartidaGateway {
  private constructor() { super(); }

  public static criar() {
    return new PartidaRepositorio();
  }

  public async salvar(partida: Partida): Promise<void> {
    await this.conectar();
    await PartidaModel.create({
      id: partida.id,
      torneioId: partida.torneioId,
      rodada: partida.rodada,
      jogador1Id: partida.jogador1Id,
      jogador2Id: partida.jogador2Id,
      deckJogador1Id: partida.deckJogador1Id,
      deckJogador2Id: partida.deckJogador2Id,
      vitoriasJogador1: partida.vitoriasJogador1,
      vitoriasJogador2: partida.vitoriasJogador2,
      status: partida.status,
      criadoEm: partida.criadoEm,
    });
  }

  public async salvarVarias(partidas: Partida[]): Promise<void> {
    await this.conectar();
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
      }))
    );
  }

  public async buscarPorId(id: string): Promise<Partida | null> {
    await this.conectar();
    const doc = await PartidaModel.findOne({ id });
    if (!doc) return null;
    return docParaPartida(doc as unknown as PartidaDocument);
  }

  public async listarPorTorneio(torneioId: string): Promise<Partida[]> {
    await this.conectar();
    const docs = await PartidaModel.find({ torneioId }).sort({ rodada: 1 }).lean();
    return docs.map((doc) => leanParaPartida(doc as unknown as Record<string, unknown>));
  }

  public async listarPorTorneios(torneioIds: string[]): Promise<Partida[]> {
    if (torneioIds.length === 0) return [];
    await this.conectar();
    const docs = await PartidaModel.find({ torneioId: { $in: torneioIds } }).sort({ rodada: 1 }).lean();
    return docs.map((doc) => leanParaPartida(doc as unknown as Record<string, unknown>));
  }

  public async listarPorTorneioERodada(
    torneioId: string,
    rodada: number
  ): Promise<Partida[]> {
    await this.conectar();
    const docs = await PartidaModel.find({ torneioId, rodada }).lean();
    return docs.map((doc) => leanParaPartida(doc as unknown as Record<string, unknown>));
  }

  public async listarPorJogadorETorneio(
    torneioId: string,
    usuarioId: string
  ): Promise<Partida[]> {
    await this.conectar();
    const docs = await PartidaModel.find({
      torneioId,
      $or: [{ jogador1Id: usuarioId }, { jogador2Id: usuarioId }],
    }).sort({ rodada: 1 }).lean();
    return docs.map((doc) => leanParaPartida(doc as unknown as Record<string, unknown>));
  }

  public async atualizar(partida: Partida): Promise<void> {
    await this.conectar();
    await PartidaModel.updateOne(
      { id: partida.id },
      {
        vitoriasJogador1: partida.vitoriasJogador1,
        vitoriasJogador2: partida.vitoriasJogador2,
        status: partida.status,
        contestado: partida.contestado,
      }
    );
  }

  /**
   * Finaliza atomicamente — usa findOneAndUpdate com guard status="pendente"
   * para evitar race condition quando dois jogadores registram o resultado
   * simultaneamente. Retorna null se a partida já estava finalizada.
   */
  public async finalizarAtomicamente(
    id: string,
    v1: number,
    v2: number
  ): Promise<Partida | null> {
    await this.conectar();
    const doc = await PartidaModel.findOneAndUpdate(
      { id, status: "pendente" },
      { vitoriasJogador1: v1, vitoriasJogador2: v2, status: "finalizada" },
      { new: true }
    );
    if (!doc) return null;
    return docParaPartida(doc as unknown as PartidaDocument);
  }

  /**
   * Marca a partida como contestada — mantém placar e status finalizada.
   * Retorna null se a partida não estava finalizada.
   */
  public async contestarPartida(id: string): Promise<Partida | null> {
    await this.conectar();
    const doc = await PartidaModel.findOneAndUpdate(
      { id, status: "finalizada" },
      { contestado: true },
      { new: true }
    );
    if (!doc) return null;
    return docParaPartida(doc as unknown as PartidaDocument);
  }

  /**
   * Admin ajusta resultado de partida contestada — sobrescreve placar sem verificar status.
   * Retorna null se a partida não existir ou não estiver contestada.
   */
  public async ajustarResultadoContestado(
    id: string,
    v1: number,
    v2: number
  ): Promise<Partida | null> {
    await this.conectar();
    const doc = await PartidaModel.findOneAndUpdate(
      { id, contestado: true },
      { vitoriasJogador1: v1, vitoriasJogador2: v2, contestado: false, status: "finalizada" },
      { new: true }
    );
    if (!doc) return null;
    return docParaPartida(doc as unknown as PartidaDocument);
  }

  /**
   * Atualiza o jogador2 de uma partida BYE (jogador2Id era null).
   * Usado quando um jogador entra no meio do torneio e assume o slot BYE.
   */
  public async atualizarJogador2Partida(
    id: string,
    jogador2Id: string
  ): Promise<Partida | null> {
    await this.conectar();
    const doc = await PartidaModel.findOneAndUpdate(
      { id, jogador2Id: null },
      { jogador2Id },
      { new: true }
    );
    if (!doc) return null;
    return docParaPartida(doc as unknown as PartidaDocument);
  }

  /**
   * Busca a partida BYE (jogador2Id=null) de uma rodada de um torneio, se existir.
   */
  public async buscarByePartidaRodada(
    torneioId: string,
    rodada: number
  ): Promise<Partida | null> {
    await this.conectar();
    const doc = await PartidaModel.findOne({ torneioId, rodada, jogador2Id: null });
    if (!doc) return null;
    return docParaPartida(doc as unknown as PartidaDocument);
  }

  public async existePartidaRodadaPosterior(
    torneioId: string,
    rodada: number
  ): Promise<boolean> {
    await this.conectar();
    const existe = await PartidaModel.exists({ torneioId, rodada: { $gt: rodada } });
    return existe !== null;
  }
}
