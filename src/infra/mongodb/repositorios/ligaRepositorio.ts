import mongoose, { Schema, Document } from "mongoose";
import { Liga } from "../../../dominio/entidade/liga";
import { FiltrosListarLigas, LigaGateway } from "../../../dominio/gateway/ligaGateway";
import { BaseRepositorio } from "./baseRepositorio";
import { escaparRegex } from "../../../helpers/regex";

interface LigaDocument extends Document {
  id: string;
  nome: string;
  descricao?: string;
  donoId: string;
  torneioIds: string[];
  tipo: string;
  criadoEm: Date;
}

const ligaSchema = new Schema<LigaDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true, maxlength: 100 },
  descricao: { type: String, maxlength: 500 },
  donoId: { type: String, required: true },
  torneioIds: {
    type: [String],
    default: [],
    validate: {
      validator: (arr: string[]) => arr.length <= 25,
      message: "liga não pode ter mais de 25 torneios",
    },
  },
  tipo: { type: String, enum: ["individual", "times"], default: "individual" },
  criadoEm: { type: Date, default: Date.now },
});

ligaSchema.index({ criadoEm: -1 });

const LigaModel =
  mongoose.models.Liga || mongoose.model<LigaDocument>("Liga", ligaSchema);

function docParaLiga(doc: LigaDocument): Liga {
  return new Liga({
    id: doc.get("id"),
    nome: doc.get("nome"),
    descricao: doc.get("descricao") ?? undefined,
    donoId: doc.get("donoId"),
    torneioIds: doc.get("torneioIds") ?? [],
    tipo: doc.get("tipo") ?? "individual",
    criadoEm: doc.get("criadoEm"),
  });
}

export class LigaRepositorio extends BaseRepositorio implements LigaGateway {
  private constructor() { super(); }

  public static criar() {
    return new LigaRepositorio();
  }

  public async salvar(liga: Liga): Promise<void> {
    await this.conectar();
    await LigaModel.create({
      id: liga.id,
      nome: liga.nome,
      descricao: liga.descricao,
      donoId: liga.donoId,
      torneioIds: liga.torneioIds,
      tipo: liga.tipo,
      criadoEm: liga.criadoEm,
    });
  }

  public async buscarPorId(id: string): Promise<Liga | null> {
    await this.conectar();
    const doc = await LigaModel.findOne({ id });
    if (!doc) return null;
    return docParaLiga(doc as unknown as LigaDocument);
  }

  public async listar(filtros: FiltrosListarLigas = {}): Promise<Liga[]> {
    await this.conectar();
    const filtroQuery: Record<string, unknown> = {};
    if (filtros.tipo) filtroQuery.tipo = filtros.tipo;
    if (filtros.nome) filtroQuery.nome = { $regex: escaparRegex(filtros.nome), $options: "i" };
    let find = LigaModel.find(filtroQuery).sort({ criadoEm: -1, id: 1 });
    if (filtros.offset !== undefined) find = find.skip(filtros.offset);
    if (filtros.limite !== undefined) find = find.limit(filtros.limite);
    const docs = await find;
    return docs.map((doc) => docParaLiga(doc as unknown as LigaDocument));
  }

  public async listarTotal(filtros: Pick<FiltrosListarLigas, 'tipo' | 'nome'> = {}): Promise<number> {
    await this.conectar();
    const filtroQuery: Record<string, unknown> = {};
    if (filtros.tipo) filtroQuery.tipo = filtros.tipo;
    if (filtros.nome) filtroQuery.nome = { $regex: escaparRegex(filtros.nome), $options: "i" };
    return LigaModel.countDocuments(filtroQuery);
  }

  public async buscarPorTorneioIds(torneioIds: string[]): Promise<Liga[]> {
    if (torneioIds.length === 0) return [];
    await this.conectar();
    const docs = await LigaModel.find({ torneioIds: { $in: torneioIds } }).sort({ criadoEm: -1, id: 1 });
    return docs.map((doc) => docParaLiga(doc as unknown as LigaDocument));
  }

  public async atualizar(liga: Liga): Promise<void> {
    await this.conectar();
    await LigaModel.updateOne(
      { id: liga.id },
      {
        nome: liga.nome,
        descricao: liga.descricao,
        torneioIds: liga.torneioIds,
        tipo: liga.tipo,
      }
    );
  }

  public async excluir(id: string): Promise<void> {
    await this.conectar();
    await LigaModel.deleteOne({ id });
  }
}
