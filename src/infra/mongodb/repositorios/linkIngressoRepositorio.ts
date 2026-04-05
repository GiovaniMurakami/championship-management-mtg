import mongoose, { Schema, Document } from "mongoose";
import { LinkIngressoGateway, LinkIngressoData } from "../../../dominio/gateway/linkIngressoGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface LinkIngressoDocument extends Document {
    token: string;
    torneioId: string;
    criadoPorId: string;
    expiresAt: Date;
}

const linkIngressoSchema = new Schema<LinkIngressoDocument>({
    token: { type: String, required: true, unique: true },
    torneioId: { type: String, required: true, index: true },
    criadoPorId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
});

// TTL index — MongoDB remove automaticamente documentos expirados
linkIngressoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LinkIngressoModel =
    mongoose.models.LinkIngresso ||
    mongoose.model<LinkIngressoDocument>("LinkIngresso", linkIngressoSchema);

export class LinkIngressoRepositorio extends BaseRepositorio implements LinkIngressoGateway {
    private constructor() { super(); }

    public static criar() {
        return new LinkIngressoRepositorio();
    }

    public async salvar(dados: LinkIngressoData): Promise<void> {
        await this.conectar();
        await LinkIngressoModel.create({
            token: dados.token,
            torneioId: dados.torneioId,
            criadoPorId: dados.criadoPorId,
            expiresAt: dados.expiresAt,
        });
    }

    public async buscarPorToken(token: string): Promise<LinkIngressoData | null> {
        await this.conectar();
        const doc = await LinkIngressoModel.findOne({ token });
        if (!doc) return null;
        return {
            token: doc.token,
            torneioId: doc.torneioId,
            criadoPorId: doc.criadoPorId,
            expiresAt: doc.expiresAt,
        };
    }

    public async excluirPorToken(token: string): Promise<void> {
        await this.conectar();
        await LinkIngressoModel.deleteOne({ token });
    }
}
