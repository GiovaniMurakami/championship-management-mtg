import mongoose, { Schema, Document } from "mongoose";
import { TokenBlacklistGateway } from "../../../dominio/gateway/tokenBlacklistGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface TokenBlacklistDocument extends Document {
  token: string;
  expiresAt: Date;
}

const tokenBlacklistSchema = new Schema<TokenBlacklistDocument>({
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TokenBlacklistModel =
  mongoose.models.TokenBlacklist ||
  mongoose.model<TokenBlacklistDocument>("TokenBlacklist", tokenBlacklistSchema);

export class TokenBlacklistRepositorio extends BaseRepositorio implements TokenBlacklistGateway {
  private constructor() { super(); }

  public static criar() {
    return new TokenBlacklistRepositorio();
  }

  public async adicionar(token: string, expiresAt: Date): Promise<void> {
    await this.conectar();
    await TokenBlacklistModel.create({ token, expiresAt });
  }

  public async existe(token: string): Promise<boolean> {
    await this.conectar();
    const doc = await TokenBlacklistModel.findOne({ token });
    return doc !== null;
  }
}
