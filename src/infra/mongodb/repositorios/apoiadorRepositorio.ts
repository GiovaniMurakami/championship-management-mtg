import mongoose, { Schema, Document } from "mongoose";
import { Apoiador } from "../../../dominio/entidade/apoiador";
import { ApoiadorGateway } from "../../../dominio/gateway/apoiadorGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface ApoiadorDocument extends Document {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

const apoiadorSchema = new Schema<ApoiadorDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true, maxlength: 160 },
  ordem: { type: Number, default: 0 },
  ativo: { type: Boolean, default: true },
  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now },
});

apoiadorSchema.index({ ativo: 1, ordem: 1, nome: 1 });

const ApoiadorModel =
  mongoose.models.Apoiador || mongoose.model<ApoiadorDocument>("Apoiador", apoiadorSchema);

function docParaApoiador(doc: ApoiadorDocument): Apoiador {
  return new Apoiador({
    id: doc.get("id"),
    nome: doc.get("nome"),
    ordem: doc.get("ordem") ?? 0,
    ativo: doc.get("ativo") ?? true,
    criadoEm: doc.get("criadoEm"),
    atualizadoEm: doc.get("atualizadoEm"),
  });
}

export class ApoiadorRepositorio extends BaseRepositorio implements ApoiadorGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new ApoiadorRepositorio();
  }

  public async salvar(apoiador: Apoiador): Promise<void> {
    await this.conectar();
    await ApoiadorModel.create({
      id: apoiador.id,
      nome: apoiador.nome,
      ordem: apoiador.ordem,
      ativo: apoiador.ativo,
      criadoEm: apoiador.criadoEm,
      atualizadoEm: apoiador.atualizadoEm,
    });
  }

  public async buscarPorId(id: string): Promise<Apoiador | null> {
    await this.conectar();
    const doc = await ApoiadorModel.findOne({ id });
    if (!doc) return null;
    return docParaApoiador(doc as unknown as ApoiadorDocument);
  }

  public async listar(apenasAtivos = false): Promise<Apoiador[]> {
    await this.conectar();
    const filtro = apenasAtivos ? { ativo: true } : {};
    const docs = await ApoiadorModel.find(filtro).sort({ ordem: 1, nome: 1 });
    return docs.map((doc) => docParaApoiador(doc as unknown as ApoiadorDocument));
  }

  public async atualizar(apoiador: Apoiador): Promise<void> {
    await this.conectar();
    await ApoiadorModel.updateOne(
      { id: apoiador.id },
      {
        nome: apoiador.nome,
        ordem: apoiador.ordem,
        ativo: apoiador.ativo,
        atualizadoEm: apoiador.atualizadoEm,
      },
    );
  }

  public async excluir(id: string): Promise<void> {
    await this.conectar();
    await ApoiadorModel.deleteOne({ id });
  }
}
