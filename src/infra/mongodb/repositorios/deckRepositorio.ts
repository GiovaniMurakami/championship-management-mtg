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
    nome: { type: String, required: true, maxlength: 200 },
    quantidade: { type: Number, required: true, max: 99 },
  },
  { _id: false }
);

const deckSchema = new Schema<DeckDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true, maxlength: 100 },
  nomeConsolidado: { type: String, default: null, maxlength: 100 },
  formato: { type: String, required: true, maxlength: 50 },
  maindeck: {
    type: [cartaSchema],
    default: [],
    validate: {
      validator: (arr: Carta[]) => arr.length <= 100,
      message: "maindeck não pode ter mais de 100 entradas",
    },
  },
  sideboard: {
    type: [cartaSchema],
    default: [],
    validate: {
      validator: (arr: Carta[]) => arr.length <= 15,
      message: "sideboard não pode ter mais de 15 entradas",
    },
  },
  usuarioId: { type: String, required: true },
  criadoEm: { type: Date, default: Date.now },
});

deckSchema.index({ usuarioId: 1 });
deckSchema.index({ criadoEm: -1 });
deckSchema.index({ usuarioId: 1, formato: 1 });

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

  private escaparRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private construirQueryDeck(filtros: FiltrosListarDecks): FilterQuery<DeckDocument> {
    const query: FilterQuery<DeckDocument> = {};
    if (filtros.usuarioId) query.usuarioId = filtros.usuarioId;
    if (filtros.formato) query.formato = { $regex: this.escaparRegex(filtros.formato), $options: "i" };
    if (filtros.nome) query.nome = { $regex: this.escaparRegex(filtros.nome), $options: "i" };
    if (filtros.criadoApos || filtros.criadoAntes) {
      query.criadoEm = {};
      if (filtros.criadoApos) query.criadoEm.$gte = filtros.criadoApos;
      if (filtros.criadoAntes) query.criadoEm.$lte = filtros.criadoAntes;
    }
    return query;
  }

  public async listar(filtros: FiltrosListarDecks): Promise<Deck[]> {
    await this.conectar();
    const query = this.construirQueryDeck(filtros);
    let find = DeckModel.find(query).sort({ criadoEm: -1, id: 1 });
    if (filtros.offset !== undefined) find = find.skip(filtros.offset);
    if (filtros.limite !== undefined) find = find.limit(filtros.limite);
    const docs = await find;
    return docs.map(docParaDeck);
  }

  public async listarTotal(filtros: Pick<FiltrosListarDecks, "usuarioId" | "formato"> = {}): Promise<number> {
    await this.conectar();
    const query = this.construirQueryDeck(filtros);
    return DeckModel.countDocuments(query);
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
