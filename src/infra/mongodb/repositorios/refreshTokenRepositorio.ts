import mongoose, { Schema, Document } from "mongoose";
import { RefreshTokenGateway, RefreshTokenData } from "../../../dominio/gateway/refreshTokenGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface RefreshTokenDocument extends Document {
  token: string;
  usuarioId: string;
  expiresAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDocument>({
  token: { type: String, required: true, unique: true },
  usuarioId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
});

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshTokenModel =
  mongoose.models.RefreshToken ||
  mongoose.model<RefreshTokenDocument>("RefreshToken", refreshTokenSchema);

export class RefreshTokenRepositorio extends BaseRepositorio implements RefreshTokenGateway {
  private constructor() { super(); }

  public static criar() {
    return new RefreshTokenRepositorio();
  }

  public async salvar(dados: RefreshTokenData): Promise<void> {
    await this.conectar();
    await RefreshTokenModel.create({
      token: dados.token,
      usuarioId: dados.usuarioId,
      expiresAt: dados.expiresAt,
    });
  }

  public async consumir(token: string): Promise<RefreshTokenData | null> {
    await this.conectar();
    const doc = await RefreshTokenModel.findOneAndDelete({ token });
    if (!doc) return null;
    if (doc.expiresAt < new Date()) return null;
    return {
      token: doc.token,
      usuarioId: doc.usuarioId,
      expiresAt: doc.expiresAt,
    };
  }

  public async excluirPorUsuario(usuarioId: string): Promise<void> {
    await this.conectar();
    await RefreshTokenModel.deleteMany({ usuarioId });
  }
}
