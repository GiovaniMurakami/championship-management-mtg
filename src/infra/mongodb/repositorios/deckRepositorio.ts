import mongoose, { Schema, Document, FilterQuery } from "mongoose";
import { Carta, Deck } from "../../../dominio/entidade/deck";
import { DeckGateway, FiltrosListarDecks } from "../../../dominio/gateway/deckGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface DeckDocument extends Document {
  id: string;
  nome: string;
  nomeConsolidado?: string | null;
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
  nomeConsolidado: { type: String, default: null },
  formato: { type: String, required: true },
  maindeck: { type: [cartaSchema], default: [] },
  sideboard: { type: [cartaSchema], default: [] },
  usuarioId: { type: String, required: true },
  criadoEm: { type: Date, default: Date.now },
});

const DeckModel =
  mongoose.models.Deck ||
  mongoose.model<DeckDocument>("Deck", deckSchema);

function docParaDeck(doc: Document): Deck {
  return new Deck({
    id: doc.get("id"),
    nome: doc.get("nome"),
    nomeConsolidado: doc.get("nomeConsolidado") ?? null,
    formato: doc.get("formato"),
    maindeck: doc.get("maindeck"),
    sideboard: doc.get("sideboard"),
    usuarioId: doc.get("usuarioId"),
    criadoEm: doc.get("criadoEm"),
  });
}

export class DeckRepositorio extends BaseRepositorio implements DeckGateway {
  private constructor() { super(); }

  public static criar() {
    return new DeckRepositorio();
  }

  public async salvar(deck: Deck): Promise<void> {
    await this.conectar();
    await DeckModel.create({
      id: deck.id,
      nome: deck.nome,
      nomeConsolidado: deck.nomeConsolidado,
      formato: deck.formato,
      maindeck: deck.maindeck,
      sideboard: deck.sideboard,
      usuarioId: deck.usuarioId,
      criadoEm: deck.criadoEm,
    });
  }

  public async buscarPorId(id: string): Promise<Deck | null> {
    await this.conectar();
    const doc = await DeckModel.findOne({ id });
    if (!doc) return null;
    return docParaDeck(doc);
  }

  public async listarPorUsuario(usuarioId: string): Promise<Deck[]> {
    await this.conectar();
    const docs = await DeckModel.find({ usuarioId });
    return docs.map(docParaDeck);
  }

  public async listar(filtros: FiltrosListarDecks): Promise<Deck[]> {
    await this.conectar();
    const query: FilterQuery<DeckDocument> = {};
    if (filtros.usuarioId) query.usuarioId = filtros.usuarioId;
    if (filtros.formato) query.formato = { $regex: filtros.formato, $options: "i" };
    if (filtros.criadoApos || filtros.criadoAntes) {
      query.criadoEm = {};
      if (filtros.criadoApos) query.criadoEm.$gte = filtros.criadoApos;
      if (filtros.criadoAntes) query.criadoEm.$lte = filtros.criadoAntes;
    }
    const docs = await DeckModel.find(query).sort({ criadoEm: -1 });
    return docs.map(docParaDeck);
  }

  public async atualizar(deck: Deck): Promise<void> {
    await this.conectar();
    await DeckModel.updateOne(
      { id: deck.id },
      {
        nome: deck.nome,
        nomeConsolidado: deck.nomeConsolidado,
        formato: deck.formato,
        maindeck: deck.maindeck,
        sideboard: deck.sideboard,
      }
    );
  }

  public async buscarVarios(ids: string[]): Promise<Deck[]> {
    await this.conectar();
    const docs = await DeckModel.find({ id: { $in: ids } });
    return docs.map(docParaDeck);
  }

  public async excluir(id: string): Promise<void> {
    await this.conectar();
    await DeckModel.deleteOne({ id });
  }
}
