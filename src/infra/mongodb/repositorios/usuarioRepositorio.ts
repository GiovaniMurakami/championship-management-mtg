import mongoose, { Schema, Document } from "mongoose";
import { Usuario } from "../../../dominio/entidade/usuario";
import { UsuarioGateway } from "../../../dominio/gateway/usuarioGateway";
import { BaseRepositorio } from "./baseRepositorio";
import { escaparRegex } from "../../../helpers/regex";

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
  pontosRank?: number;
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
  pontosRank: { type: Number, required: true, default: 500 },
  criadoEm: { type: Date, default: Date.now },
});

usuarioSchema.index({ pontosRank: -1, id: 1 });

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
      resultadosExpressivos: usuario.resultadosExpressivos,
      pontosRank: usuario.pontosRank,
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
      resultadosExpressivos: doc.get("resultadosExpressivos") ?? 0,
      pontosRank: doc.get("pontosRank") ?? 500,
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
      resultadosExpressivos: doc.get("resultadosExpressivos") ?? 0,
      pontosRank: doc.get("pontosRank") ?? 500,
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
          resultadosExpressivos: doc.get("resultadosExpressivos") ?? 0,
          pontosRank: doc.get("pontosRank") ?? 500,
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
        resultadosExpressivos: usuario.resultadosExpressivos,
        pontosRank: usuario.pontosRank,
      }
    );
  }

  public async incrementarResultadosExpressivos(ids: string[], incremento: number): Promise<void> {
    if (ids.length === 0 || incremento === 0) return;
    await this.conectar();
    await UsuarioModel.updateMany(
      { id: { $in: ids } },
      { $inc: { resultadosExpressivos: incremento } }
    );
  }

  public async incrementarPontosRank(alteracoes: Array<{ id: string; delta: number }>): Promise<void> {
    const validas = alteracoes.filter((a) => a.delta !== 0);
    if (validas.length === 0) return;
    await this.conectar();
    await Promise.all(
      validas.map(({ id, delta }) =>
        UsuarioModel.updateOne({ id }, { $inc: { pontosRank: delta } })
      )
    );
    await UsuarioModel.updateMany(
      { id: { $in: validas.map((a) => a.id) }, pontosRank: { $lt: 0 } },
      { $set: { pontosRank: 0 } }
    );
  }

  public async listarRanking(
    limite: number,
    offset: number,
    nome?: string
  ): Promise<{ usuarios: Usuario[]; total: number }> {
    await this.conectar();
    const filtro: Record<string, unknown> = {};
    if (nome) {
      filtro.nome = { $regex: escaparRegex(nome), $options: "i" };
    }

    const [docs, total] = await Promise.all([
      UsuarioModel.find(filtro)
        .sort({ pontosRank: -1, criadoEm: 1 })
        .skip(offset)
        .limit(limite)
        .lean(),
      UsuarioModel.countDocuments(filtro),
    ]);

    const usuarios = docs.map(
      (doc) =>
        new Usuario({
          id: doc.id,
          nome: doc.nome,
          email: doc.email,
          senha: "",
          role: (doc.role as "user" | "admin") || "user",
          telefone: doc.telefone,
          nickMTGO: doc.nickMTGO,
          nickArena: doc.nickArena,
          resultadosExpressivos: doc.resultadosExpressivos ?? 0,
          pontosRank: doc.pontosRank ?? 500,
          criadoEm: doc.criadoEm,
        })
    );

    return { usuarios, total };
  }
}
