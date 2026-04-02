import mongoose, { Schema, Document } from "mongoose";
import { LoginAttemptGateway } from "../../../dominio/gateway/loginAttemptGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface LoginAttemptDocument extends Document {
  email: string;
  tentativas: number;
  expiresAt: Date;
}

const loginAttemptSchema = new Schema<LoginAttemptDocument>({
  email: { type: String, required: true, unique: true },
  tentativas: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

loginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LoginAttemptModel =
  mongoose.models.LoginAttempt ||
  mongoose.model<LoginAttemptDocument>("LoginAttempt", loginAttemptSchema);

export class LoginAttemptRepositorio extends BaseRepositorio implements LoginAttemptGateway {
  private constructor() { super(); }

  public static criar() {
    return new LoginAttemptRepositorio();
  }

  public async registrarFalha(email: string): Promise<void> {
    await this.conectar();
    await LoginAttemptModel.findOneAndUpdate(
      { email },
      {
        $inc: { tentativas: 1 },
        $setOnInsert: { expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
      },
      { upsert: true }
    );
  }

  public async obterFalhas(email: string): Promise<number> {
    await this.conectar();
    const doc = await LoginAttemptModel.findOne({ email });
    return doc?.tentativas ?? 0;
  }

  public async resetar(email: string): Promise<void> {
    await this.conectar();
    await LoginAttemptModel.deleteOne({ email });
  }
}
