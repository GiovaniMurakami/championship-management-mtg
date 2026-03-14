import mongoose, { Schema, Document, FilterQuery } from "mongoose";
import { Carta, Deck } from "../../../dominio/entidade/deck";
import { DeckGateway, FiltrosListarDecks } from "../../../dominio/gateway/deckGateway";
import { conectarMongoDB } from "../conexao";

interface DeckDocument extends Document {
  id: string;
  nome: string;
  formato: string;
  maindeck: Carta[];
  sideboard: Carta[];
  usuarioId: string;
  criadoEm: Date;
}

const cartaSchema = new Schema<Carta>(
  {
    nome: { type: String, required: true },
    quantidade: { type: Number, required: true },
  },
  { _id: false }
);

const deckSchema = new Schema<DeckDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  formato: { type: String, required: true },
  maindeck: { type: [cartaSchema], default: [] },
  sideboard: { type: [cartaSchema], default: [] },
  usuarioId: { type: String, required: true },
  criadoEm: { type: Date, default: Date.now },
});

const DeckModel =
  mongoose.models.Deck ||
  mongoose.model<DeckDocument>("Deck", deckSchema);

export class DeckRepositorio implements DeckGateway {
  private constructor() { }

  public static criar() {
    return new DeckRepositorio();
  }

  public async salvar(deck: Deck): Promise<void> {
    await conectarMongoDB();
    await DeckModel.create({
      id: deck.id,
      nome: deck.nome,
      formato: deck.formato,
      maindeck: deck.maindeck,
      sideboard: deck.sideboard,
      usuarioId: deck.usuarioId,
      criadoEm: deck.criadoEm,
    });
  }

  public async buscarPorId(id: string): Promise<Deck | null> {
    await conectarMongoDB();
    const doc = await DeckModel.findOne({ id });
    if (!doc) return null;
    return new Deck({
      id: doc.get("id"),
      nome: doc.get("nome"),
      formato: doc.get("formato"),
      maindeck: doc.get("maindeck"),
      sideboard: doc.get("sideboard"),
      usuarioId: doc.get("usuarioId"),
      criadoEm: doc.get("criadoEm"),
    });
  }

  public async listarPorUsuario(usuarioId: string): Promise<Deck[]> {
    await conectarMongoDB();
    const docs = await DeckModel.find({ usuarioId });
    return docs.map(
      (doc) =>
        new Deck({
          id: doc.get("id"),
          nome: doc.get("nome"),
          formato: doc.get("formato"),
          maindeck: doc.get("maindeck"),
          sideboard: doc.get("sideboard"),
          usuarioId: doc.get("usuarioId"),
          criadoEm: doc.get("criadoEm"),
        })
    );
  }

  public async listar(filtros: FiltrosListarDecks): Promise<Deck[]> {
    await conectarMongoDB();
    const query: FilterQuery<DeckDocument> = {};
    if (filtros.usuarioId) query.usuarioId = filtros.usuarioId;
    if (filtros.formato) query.formato = { $regex: filtros.formato, $options: "i" };
    if (filtros.criadoApos || filtros.criadoAntes) {
      query.criadoEm = {};
      if (filtros.criadoApos) query.criadoEm.$gte = filtros.criadoApos;
      if (filtros.criadoAntes) query.criadoEm.$lte = filtros.criadoAntes;
    }
    const docs = await DeckModel.find(query).sort({ criadoEm: -1 });
    return docs.map(
      (doc) =>
        new Deck({
          id: doc.get("id"),
          nome: doc.get("nome"),
          formato: doc.get("formato"),
          maindeck: doc.get("maindeck"),
          sideboard: doc.get("sideboard"),
          usuarioId: doc.get("usuarioId"),
          criadoEm: doc.get("criadoEm"),
        })
    );
  }

  public async atualizar(deck: Deck): Promise<void> {
    await conectarMongoDB();
    await DeckModel.updateOne(
      { id: deck.id },
      {
        nome: deck.nome,
        formato: deck.formato,
        maindeck: deck.maindeck,
        sideboard: deck.sideboard,
      }
    );
  }

  public async buscarVarios(ids: string[]): Promise<Deck[]> {
    await conectarMongoDB();
    const docs = await DeckModel.find({ id: { $in: ids } });
    return docs.map(
      (doc) =>
        new Deck({
          id: doc.get("id"),
          nome: doc.get("nome"),
          formato: doc.get("formato"),
          maindeck: doc.get("maindeck"),
          sideboard: doc.get("sideboard"),
          usuarioId: doc.get("usuarioId"),
          criadoEm: doc.get("criadoEm"),
        })
    );
  }

  public async excluir(id: string): Promise<void> {
    await conectarMongoDB();
    await DeckModel.deleteOne({ id });
  }
}
