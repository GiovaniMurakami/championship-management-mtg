import mongoose, { Schema, Document } from "mongoose";
import { ResetSenhaGateway, ResetSenhaData } from "../../../dominio/gateway/resetSenhaGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface ResetSenhaDocument extends Document {
    token: string;
    usuarioId: string;
    expiresAt: Date;
}

const resetSenhaSchema = new Schema<ResetSenhaDocument>({
    token: { type: String, required: true, unique: true },
    usuarioId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
});

resetSenhaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ResetSenhaModel =
    mongoose.models.ResetSenha ||
    mongoose.model<ResetSenhaDocument>("ResetSenha", resetSenhaSchema);

export class ResetSenhaRepositorio extends BaseRepositorio implements ResetSenhaGateway {
    private constructor() { super(); }

    public static criar() {
        return new ResetSenhaRepositorio();
    }

    public async salvar(dados: ResetSenhaData): Promise<void> {
        await this.conectar();
        await ResetSenhaModel.create({
            token: dados.token,
            usuarioId: dados.usuarioId,
            expiresAt: dados.expiresAt,
        });
    }

    public async buscarPorToken(token: string): Promise<ResetSenhaData | null> {
        await this.conectar();
        const doc = await ResetSenhaModel.findOne({ token });
        if (!doc) return null;
        return {
            token: doc.token,
            usuarioId: doc.usuarioId,
            expiresAt: doc.expiresAt,
        };
    }

    public async excluirPorToken(token: string): Promise<void> {
        await this.conectar();
        await ResetSenhaModel.deleteOne({ token });
    }

    public async excluirPorUsuario(usuarioId: string): Promise<void> {
        await this.conectar();
        await ResetSenhaModel.deleteMany({ usuarioId });
    }
}
