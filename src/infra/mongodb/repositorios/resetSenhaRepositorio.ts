import mongoose, { Schema, Document } from "mongoose";
import { ResetSenhaGateway, ResetSenhaData } from "../../../dominio/gateway/resetSenhaGateway";
import { BaseRepositorio } from "./baseRepositorio";
import { hashToken } from "../../../helpers/tokenHash";

interface ResetSenhaDocument extends Document {
    token?: string;
    tokenHash: string;
    usuarioId: string;
    expiresAt: Date;
}

const resetSenhaSchema = new Schema<ResetSenhaDocument>({
    token: { type: String, required: false, unique: true, sparse: true },
    tokenHash: { type: String, required: true, unique: true },
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
        const tokenHash = hashToken(dados.token);
        await ResetSenhaModel.create({
            token: tokenHash,
            tokenHash,
            usuarioId: dados.usuarioId,
            expiresAt: dados.expiresAt,
        });
    }

    public async buscarPorToken(token: string): Promise<ResetSenhaData | null> {
        await this.conectar();
        const tokenHash = hashToken(token);
        const doc = await ResetSenhaModel.findOne({
            $or: [
                { tokenHash },
                { token: tokenHash },
                { token },
            ],
        });
        if (!doc) return null;
        return {
            token,
            usuarioId: doc.usuarioId,
            expiresAt: doc.expiresAt,
        };
    }

    public async excluirPorToken(token: string): Promise<void> {
        await this.conectar();
        const tokenHash = hashToken(token);
        await ResetSenhaModel.deleteOne({
            $or: [
                { tokenHash },
                { token: tokenHash },
                { token },
            ],
        });
    }

    public async excluirPorUsuario(usuarioId: string): Promise<void> {
        await this.conectar();
        await ResetSenhaModel.deleteMany({ usuarioId });
    }
}
