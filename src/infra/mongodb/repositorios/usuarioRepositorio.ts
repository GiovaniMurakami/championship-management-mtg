import mongoose, { Schema, Document } from "mongoose";
import { Usuario } from "../../../dominio/entidade/usuario";
import { FiltrosListarUsuarios, UsuarioGateway } from "../../../dominio/gateway/usuarioGateway";
import { BaseRepositorio } from "./baseRepositorio";
import { montarFiltroListagemUsuarios } from "../../../helpers/usuario/filtroListagemUsuarios";

interface UsuarioDocument extends Document {
  id: string;
  nome: string;
  email: string;
  senha: string;
  role: string;
  telefone?: string;
  nickMTGO?: string;
  nickArena?: string;
  resultadosExpressivos?: number;
  bloqueadoTorneios?: boolean;
  excluido?: boolean;
  excluidoEm?: Date | null;
  criadoEm: Date;
}

const usuarioSchema = new Schema<UsuarioDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, maxlength: 254 },
  senha: { type: String, required: true, maxlength: 128, select: false },
  role: { type: String, required: true, default: "user" },
  telefone: { type: String, required: false, maxlength: 20 },
  nickMTGO: { type: String, required: false, maxlength: 50 },
  nickArena: { type: String, required: false, maxlength: 50 },
  resultadosExpressivos: { type: Number, required: true, default: 0 },
  bloqueadoTorneios: { type: Boolean, required: true, default: false },
  excluido: { type: Boolean, required: true, default: false },
  excluidoEm: { type: Date, required: false, default: null },
  criadoEm: { type: Date, default: Date.now },
});

usuarioSchema.index({ nome: 1, id: 1 });
usuarioSchema.index({ bloqueadoTorneios: 1, nome: 1, id: 1 });
usuarioSchema.index({ excluido: 1, nome: 1, id: 1 });

const UsuarioModel =
  mongoose.models.Usuario ||
  mongoose.model<UsuarioDocument>("Usuario", usuarioSchema);

function docParaUsuario(doc: UsuarioDocument): Usuario {
  return new Usuario({
    id: doc.get("id"),
    nome: doc.get("nome"),
    email: doc.get("email"),
    senha: doc.get("senha"),
    role: doc.get("role") || "user",
    telefone: doc.get("telefone"),
    nickMTGO: doc.get("nickMTGO"),
    nickArena: doc.get("nickArena"),
    resultadosExpressivos: doc.get("resultadosExpressivos") ?? 0,
    bloqueadoTorneios: doc.get("bloqueadoTorneios") ?? false,
    excluido: doc.get("excluido") ?? false,
    excluidoEm: doc.get("excluidoEm") ?? null,
    criadoEm: doc.get("criadoEm"),
  });
}

export class UsuarioRepositorio extends BaseRepositorio implements UsuarioGateway {
  private constructor() { super(); }

  public static criar() {
    return new UsuarioRepositorio();
  }

  public async salvar(usuario: Usuario): Promise<void> {
    await this.conectar();
    await UsuarioModel.create({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: usuario.senha,
      role: usuario.role,
      telefone: usuario.telefone,
      nickMTGO: usuario.nickMTGO,
      nickArena: usuario.nickArena,
      resultadosExpressivos: usuario.resultadosExpressivos,
      bloqueadoTorneios: usuario.bloqueadoTorneios,
      excluido: usuario.excluido,
      excluidoEm: usuario.excluidoEm ?? null,
      criadoEm: usuario.criadoEm,
    });
  }

  public async buscarPorEmail(email: string): Promise<Usuario | null> {
    await this.conectar();
    const doc = await UsuarioModel.findOne({ email }).select("+senha");

    if (!doc) return null;

    return docParaUsuario(doc as unknown as UsuarioDocument);
  }

  public async buscarPorId(id: string): Promise<Usuario | null> {
    await this.conectar();
    const doc = await UsuarioModel.findOne({ id });

    if (!doc) return null;

    return docParaUsuario(doc as unknown as UsuarioDocument);
  }

  public async buscarVarios(ids: string[]): Promise<Usuario[]> {
    await this.conectar();
    const docs = await UsuarioModel.find({ id: { $in: ids } });
    return docs.map((doc) => docParaUsuario(doc as unknown as UsuarioDocument));
  }

  public async listar(filtros: FiltrosListarUsuarios = {}): Promise<Usuario[]> {
    await this.conectar();
    const filtroQuery = montarFiltroListagemUsuarios(filtros);
    let query = UsuarioModel.find(filtroQuery).sort({ nome: 1, id: 1 });
    if (filtros.offset !== undefined) query = query.skip(filtros.offset);
    if (filtros.limite !== undefined) query = query.limit(filtros.limite);
    const docs = await query;
    return docs.map((doc) => docParaUsuario(doc as unknown as UsuarioDocument));
  }

  public async listarTotal(
    filtros: Pick<FiltrosListarUsuarios, "nome" | "bloqueadoTorneios"> = {},
  ): Promise<number> {
    await this.conectar();
    return UsuarioModel.countDocuments(montarFiltroListagemUsuarios(filtros));
  }

  public async atualizar(usuario: Usuario): Promise<void> {
    await this.conectar();
    await UsuarioModel.updateOne(
      { id: usuario.id },
      {
        nome: usuario.nome,
        email: usuario.email,
        senha: usuario.senha,
        telefone: usuario.telefone,
        nickMTGO: usuario.nickMTGO,
        nickArena: usuario.nickArena,
        resultadosExpressivos: usuario.resultadosExpressivos,
        bloqueadoTorneios: usuario.bloqueadoTorneios,
        excluido: usuario.excluido,
        excluidoEm: usuario.excluidoEm ?? null,
      }
    );
  }

  public async excluir(id: string): Promise<void> {
    await this.conectar();
    await UsuarioModel.deleteOne({ id });
  }

  public async incrementarResultadosExpressivos(ids: string[], incremento: number): Promise<void> {
    if (ids.length === 0 || incremento === 0) return;
    await this.conectar();
    await UsuarioModel.updateMany(
      { id: { $in: ids } },
      { $inc: { resultadosExpressivos: incremento } }
    );
  }
}
