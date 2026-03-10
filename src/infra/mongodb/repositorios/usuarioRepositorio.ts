import mongoose, { Schema, Document } from "mongoose";
import { Usuario } from "../../../dominio/entidade/usuario";
import { UsuarioGateway } from "../../../dominio/gateway/usuarioGateway";
import { conectarMongoDB } from "../conexao";

interface UsuarioDocument extends Document {
  id: string;
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  nickMTGO?: string;
  nickArena?: string;
  criadoEm: Date;
}

const usuarioSchema = new Schema<UsuarioDocument>({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  telefone: { type: String, required: false },
  nickMTGO: { type: String, required: false },
  nickArena: { type: String, required: false },
  criadoEm: { type: Date, default: Date.now },
});

const UsuarioModel =
  mongoose.models.Usuario ||
  mongoose.model<UsuarioDocument>("Usuario", usuarioSchema);

export class UsuarioRepositorio implements UsuarioGateway {
  private constructor() {}

  public static criar() {
    return new UsuarioRepositorio();
  }

  public async salvar(usuario: Usuario): Promise<void> {
    await conectarMongoDB();
    await UsuarioModel.create({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: usuario.senha,
      telefone: usuario.telefone,
      nickMTGO: usuario.nickMTGO,
      nickArena: usuario.nickArena,
      criadoEm: usuario.criadoEm,
    });
  }

  public async buscarPorEmail(email: string): Promise<Usuario | null> {
    await conectarMongoDB();
    const doc = await UsuarioModel.findOne({ email });

    if (!doc) return null;

    return new Usuario({
      id: doc.get("id"),
      nome: doc.get("nome"),
      email: doc.get("email"),
      senha: doc.get("senha"),
      telefone: doc.get("telefone"),
      nickMTGO: doc.get("nickMTGO"),
      nickArena: doc.get("nickArena"),
      criadoEm: doc.get("criadoEm"),
    });
  }

  public async buscarPorId(id: string): Promise<Usuario | null> {
    await conectarMongoDB();
    const doc = await UsuarioModel.findOne({ id });

    if (!doc) return null;

    return new Usuario({
      id: doc.get("id"),
      nome: doc.get("nome"),
      email: doc.get("email"),
      senha: doc.get("senha"),
      telefone: doc.get("telefone"),
      nickMTGO: doc.get("nickMTGO"),
      nickArena: doc.get("nickArena"),
      criadoEm: doc.get("criadoEm"),
    });
  }

  public async atualizar(usuario: Usuario): Promise<void> {
    await conectarMongoDB();
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
