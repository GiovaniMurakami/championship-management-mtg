import mongoose, { Schema, Document } from "mongoose";
import { Usuario } from "../../../dominio/entidade/usuario";
import { UsuarioGateway } from "../../../dominio/gateway/usuarioGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface UsuarioDocument extends Document {
  id: string;
  nome: string;
  email: string;
  senha: string;
  role: string;
  telefone?: string;
  nickMTGO?: string;
  nickArena?: string;
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
  criadoEm: { type: Date, default: Date.now },
});

const UsuarioModel =
  mongoose.models.Usuario ||
  mongoose.model<UsuarioDocument>("Usuario", usuarioSchema);

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
      criadoEm: usuario.criadoEm,
    });
  }

  public async buscarPorEmail(email: string): Promise<Usuario | null> {
    await this.conectar();
    const doc = await UsuarioModel.findOne({ email }).select("+senha");

    if (!doc) return null;

    return new Usuario({
      id: doc.get("id"),
      nome: doc.get("nome"),
      email: doc.get("email"),
      senha: doc.get("senha"),
      role: doc.get("role") || "user",
      telefone: doc.get("telefone"),
      nickMTGO: doc.get("nickMTGO"),
      nickArena: doc.get("nickArena"),
      criadoEm: doc.get("criadoEm"),
    });
  }

  public async buscarPorId(id: string): Promise<Usuario | null> {
    await this.conectar();
    const doc = await UsuarioModel.findOne({ id });

    if (!doc) return null;

    return new Usuario({
      id: doc.get("id"),
      nome: doc.get("nome"),
      email: doc.get("email"),
      senha: doc.get("senha"),
      role: doc.get("role") || "user",
      telefone: doc.get("telefone"),
      nickMTGO: doc.get("nickMTGO"),
      nickArena: doc.get("nickArena"),
      criadoEm: doc.get("criadoEm"),
    });
  }

  public async buscarVarios(ids: string[]): Promise<Usuario[]> {
    await this.conectar();
    const docs = await UsuarioModel.find({ id: { $in: ids } });
    return docs.map(
      (doc) =>
        new Usuario({
          id: doc.get("id"),
          nome: doc.get("nome"),
          email: doc.get("email"),
          senha: doc.get("senha"),
          role: doc.get("role") || "user",
          telefone: doc.get("telefone"),
          nickMTGO: doc.get("nickMTGO"),
          nickArena: doc.get("nickArena"),
          criadoEm: doc.get("criadoEm"),
        })
    );
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
      }
    );
  }
}
