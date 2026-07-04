import mongoose, { Schema, Document } from "mongoose";
import { Parceiro } from "../../../dominio/entidade/parceiro";
import { ParceiroGateway } from "../../../dominio/gateway/parceiroGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface ParceiroDocument extends Document {
  id: string;
  nome: string;
  imagemUrl: string;
  linkUrl?: string;
  ordem: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

const parceiroSchema = new Schema<ParceiroDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true, maxlength: 160 },
  imagemUrl: { type: String, required: true, maxlength: 800 },
  linkUrl: { type: String, maxlength: 800 },
  ordem: { type: Number, default: 0 },
  ativo: { type: Boolean, default: true },
  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now },
});

parceiroSchema.index({ ativo: 1, ordem: 1, nome: 1 });

const ParceiroModel =
  mongoose.models.Parceiro || mongoose.model<ParceiroDocument>("Parceiro", parceiroSchema);

function docParaParceiro(doc: ParceiroDocument): Parceiro {
  return new Parceiro({
    id: doc.get("id"),
    nome: doc.get("nome"),
    imagemUrl: doc.get("imagemUrl"),
    linkUrl: doc.get("linkUrl") ?? undefined,
    ordem: doc.get("ordem") ?? 0,
    ativo: doc.get("ativo") ?? true,
    criadoEm: doc.get("criadoEm"),
    atualizadoEm: doc.get("atualizadoEm"),
  });
}

export class ParceiroRepositorio extends BaseRepositorio implements ParceiroGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new ParceiroRepositorio();
  }

  public async salvar(parceiro: Parceiro): Promise<void> {
    await this.conectar();
    await ParceiroModel.create({
      id: parceiro.id,
      nome: parceiro.nome,
      imagemUrl: parceiro.imagemUrl,
      linkUrl: parceiro.linkUrl,
      ordem: parceiro.ordem,
      ativo: parceiro.ativo,
      criadoEm: parceiro.criadoEm,
      atualizadoEm: parceiro.atualizadoEm,
    });
  }

  public async buscarPorId(id: string): Promise<Parceiro | null> {
    await this.conectar();
    const doc = await ParceiroModel.findOne({ id });
    if (!doc) return null;
    return docParaParceiro(doc as unknown as ParceiroDocument);
  }

  public async listar(apenasAtivos = false): Promise<Parceiro[]> {
    await this.conectar();
    const filtro = apenasAtivos ? { ativo: true } : {};
    const docs = await ParceiroModel.find(filtro).sort({ ordem: 1, nome: 1 });
    return docs.map((doc) => docParaParceiro(doc as unknown as ParceiroDocument));
  }

  public async atualizar(parceiro: Parceiro): Promise<void> {
    await this.conectar();
    await ParceiroModel.updateOne(
      { id: parceiro.id },
      {
        nome: parceiro.nome,
        imagemUrl: parceiro.imagemUrl,
        linkUrl: parceiro.linkUrl,
        ordem: parceiro.ordem,
        ativo: parceiro.ativo,
        atualizadoEm: parceiro.atualizadoEm,
      },
    );
  }

  public async excluir(id: string): Promise<void> {
    await this.conectar();
    await ParceiroModel.deleteOne({ id });
  }
}
