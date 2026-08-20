import mongoose, { Schema, Document } from "mongoose";
import { Time } from "../../../dominio/entidade/time";
import { FiltrosListarTimes, TimeGateway } from "../../../dominio/gateway/timeGateway";
import { BaseRepositorio } from "./baseRepositorio";
import { escaparRegex } from "../../../helpers/regex";

interface TimeDocument extends Document {
    id: string;
    nome: string;
    descricao?: string;
    imagemUrl?: string;
    donoId: string;
    membroIds: string[];
    solicitacoesPendentes: string[];
    conviteToken?: string;
    criadoEm: Date;
}

const timeSchema = new Schema<TimeDocument>({
    id: { type: String, required: true, unique: true },
    nome: { type: String, required: true, maxlength: 100 },
    descricao: { type: String, maxlength: 500 },
    imagemUrl: { type: String },
    donoId: { type: String, required: true },
    membroIds: { type: [String], default: [] },
    solicitacoesPendentes: { type: [String], default: [] },
    conviteToken: { type: String },
    criadoEm: { type: Date, default: Date.now },
});

timeSchema.index({ donoId: 1 });
timeSchema.index({ criadoEm: -1, id: 1 });
timeSchema.index({ membroIds: 1 });
timeSchema.index({ conviteToken: 1 }, { unique: true, sparse: true });

const TimeModel =
    mongoose.models.Time || mongoose.model<TimeDocument>("Time", timeSchema);

function docParaTime(doc: TimeDocument): Time {
    return new Time({
        id: doc.get("id"),
        nome: doc.get("nome"),
        descricao: doc.get("descricao") ?? undefined,
        imagemUrl: doc.get("imagemUrl") ?? undefined,
        donoId: doc.get("donoId"),
        membroIds: doc.get("membroIds") ?? [],
        solicitacoesPendentes: doc.get("solicitacoesPendentes") ?? [],
        conviteToken: doc.get("conviteToken") ?? undefined,
        criadoEm: doc.get("criadoEm"),
    });
}

export class TimeRepositorio extends BaseRepositorio implements TimeGateway {
    private constructor() { super(); }

    public static criar() {
        return new TimeRepositorio();
    }

    public async salvar(time: Time): Promise<void> {
        await this.conectar();
        await TimeModel.create({
            id: time.id,
            nome: time.nome,
            descricao: time.descricao,
            imagemUrl: time.imagemUrl,
            donoId: time.donoId,
            membroIds: time.membroIds,
            solicitacoesPendentes: time.solicitacoesPendentes,
            conviteToken: time.conviteToken,
            criadoEm: time.criadoEm,
        });
    }

    public async buscarPorId(id: string): Promise<Time | null> {
        await this.conectar();
        const doc = await TimeModel.findOne({ id });
        if (!doc) return null;
        return docParaTime(doc as unknown as TimeDocument);
    }

    public async buscarVarios(ids: string[]): Promise<Time[]> {
        if (ids.length === 0) return [];
        await this.conectar();
        const docs = await TimeModel.find({ id: { $in: ids } });
        return docs.map((doc) => docParaTime(doc as unknown as TimeDocument));
    }

    public async buscarPorMembros(usuarioIds: string[]): Promise<Time[]> {
        if (usuarioIds.length === 0) return [];
        await this.conectar();
        const docs = await TimeModel.find({ membroIds: { $in: usuarioIds } });
        return docs.map((doc) => docParaTime(doc as unknown as TimeDocument));
    }

    public async buscarPorConviteToken(token: string): Promise<Time | null> {
        await this.conectar();
        const doc = await TimeModel.findOne({ conviteToken: token });
        if (!doc) return null;
        return docParaTime(doc as unknown as TimeDocument);
    }

    public async listar(filtros: FiltrosListarTimes = {}): Promise<Time[]> {
        await this.conectar();
        const filtroQuery: Record<string, unknown> = {};
        if (filtros.nome) filtroQuery.nome = { $regex: escaparRegex(filtros.nome), $options: "i" };
        if (filtros.membroId) filtroQuery.membroIds = filtros.membroId;
        let query = TimeModel.find(filtroQuery).sort({ criadoEm: -1, id: 1 });
        if (filtros.offset !== undefined) query = query.skip(filtros.offset);
        if (filtros.limite !== undefined) query = query.limit(filtros.limite);
        const docs = await query;
        return docs.map((doc) => docParaTime(doc as unknown as TimeDocument));
    }

    public async listarTotal(filtros: Pick<FiltrosListarTimes, 'nome' | 'membroId'> = {}): Promise<number> {
        await this.conectar();
        const filtroQuery: Record<string, unknown> = {};
        if (filtros.nome) filtroQuery.nome = { $regex: escaparRegex(filtros.nome), $options: "i" };
        if (filtros.membroId) filtroQuery.membroIds = filtros.membroId;
        return TimeModel.countDocuments(filtroQuery);
    }

    public async atualizar(time: Time): Promise<void> {
        await this.conectar();
        await TimeModel.updateOne(
            { id: time.id },
            {
                nome: time.nome,
                descricao: time.descricao,
                imagemUrl: time.imagemUrl,
                membroIds: time.membroIds,
                solicitacoesPendentes: time.solicitacoesPendentes,
                conviteToken: time.conviteToken,
            }
        );
    }

    public async excluir(id: string): Promise<void> {
        await this.conectar();
        await TimeModel.deleteOne({ id });
    }
}
