import mongoose, { Schema, Document } from "mongoose";
import { Partida, StatusPartida } from "../../../dominio/entidade/partida";
import { PartidaGateway } from "../../../dominio/gateway/partidaGateway";
import { conectarMongoDB } from "../conexao";

interface PartidaDocument extends Document {
  id: string;
  torneioId: string;
  rodada: number;
  jogador1Id: string;
  jogador1Nome?: string;
  jogador2Id: string | null;
  jogador2Nome?: string | null;
  deckJogador1Id?: string;
  deckJogador2Id?: string | null;
  vitoriasJogador1: number;
  vitoriasJogador2: number;
  status: StatusPartida;
  criadoEm: Date;
}

const partidaSchema = new Schema<PartidaDocument>({
  id: { type: String, required: true, unique: true },
  torneioId: { type: String, required: true },
  rodada: { type: Number, required: true },
  jogador1Id: { type: String, required: true },
  jogador1Nome: { type: String },
  jogador2Id: { type: String, default: null },
  jogador2Nome: { type: String, default: null },
  deckJogador1Id: { type: String },
  deckJogador2Id: { type: String },
  vitoriasJogador1: { type: Number, required: true, default: 0 },
  vitoriasJogador2: { type: Number, required: true, default: 0 },
  status: { type: String, required: true, default: "pendente" },
  criadoEm: { type: Date, default: Date.now },
});

const PartidaModel =
  mongoose.models.Partida ||
  mongoose.model<PartidaDocument>("Partida", partidaSchema);

function docParaPartida(doc: PartidaDocument): Partida {
  return new Partida({
    id: doc.get("id"),
    torneioId: doc.get("torneioId"),
    rodada: doc.get("rodada"),
    jogador1Id: doc.get("jogador1Id"),
    jogador1Nome: doc.get("jogador1Nome") ?? undefined,
    jogador2Id: doc.get("jogador2Id"),
    jogador2Nome: doc.get("jogador2Nome") ?? undefined,
    deckJogador1Id: doc.get("deckJogador1Id") ?? undefined,
    deckJogador2Id: doc.get("deckJogador2Id") ?? undefined,
    vitoriasJogador1: doc.get("vitoriasJogador1"),
    vitoriasJogador2: doc.get("vitoriasJogador2"),
    status: doc.get("status"),
    criadoEm: doc.get("criadoEm"),
  });
}

export class PartidaRepositorio implements PartidaGateway {
  private constructor() { }

  public static criar() {
    return new PartidaRepositorio();
  }

  public async salvar(partida: Partida): Promise<void> {
    await conectarMongoDB();
    await PartidaModel.create({
      id: partida.id,
      torneioId: partida.torneioId,
      rodada: partida.rodada,
      jogador1Id: partida.jogador1Id,
      jogador1Nome: partida.jogador1Nome,
      jogador2Id: partida.jogador2Id,
      jogador2Nome: partida.jogador2Nome,
      deckJogador1Id: partida.deckJogador1Id,
      deckJogador2Id: partida.deckJogador2Id,
      vitoriasJogador1: partida.vitoriasJogador1,
      vitoriasJogador2: partida.vitoriasJogador2,
      status: partida.status,
      criadoEm: partida.criadoEm,
    });
  }

  public async salvarVarias(partidas: Partida[]): Promise<void> {
    await conectarMongoDB();
    await PartidaModel.insertMany(
      partidas.map((p) => ({
        id: p.id,
        torneioId: p.torneioId,
        rodada: p.rodada,
        jogador1Id: p.jogador1Id,
        jogador1Nome: p.jogador1Nome,
        jogador2Id: p.jogador2Id,
        jogador2Nome: p.jogador2Nome,
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
    await conectarMongoDB();
    const doc = await PartidaModel.findOne({ id });
    if (!doc) return null;
    return docParaPartida(doc as unknown as PartidaDocument);
  }

  public async listarPorTorneio(torneioId: string): Promise<Partida[]> {
    await conectarMongoDB();
    const docs = await PartidaModel.find({ torneioId }).sort({ rodada: 1 });
    return docs.map((doc) => docParaPartida(doc as unknown as PartidaDocument));
  }

  public async listarPorTorneioERodada(
    torneioId: string,
    rodada: number
  ): Promise<Partida[]> {
    await conectarMongoDB();
    const docs = await PartidaModel.find({ torneioId, rodada });
    return docs.map((doc) => docParaPartida(doc as unknown as PartidaDocument));
  }

  public async listarPorJogadorETorneio(
    torneioId: string,
    usuarioId: string
  ): Promise<Partida[]> {
    await conectarMongoDB();
    const docs = await PartidaModel.find({
      torneioId,
      $or: [{ jogador1Id: usuarioId }, { jogador2Id: usuarioId }],
    }).sort({ rodada: 1 });
    return docs.map((doc) => docParaPartida(doc as unknown as PartidaDocument));
  }

  public async atualizar(partida: Partida): Promise<void> {
    await conectarMongoDB();
    await PartidaModel.updateOne(
      { id: partida.id },
      {
        vitoriasJogador1: partida.vitoriasJogador1,
        vitoriasJogador2: partida.vitoriasJogador2,
        status: partida.status,
      }
    );
  }
}
