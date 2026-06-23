import mongoose, { Schema, Document } from "mongoose";
import { Store, ClientRateLimitInfo } from "express-rate-limit";
import { conectarMongoDB } from "./conexao";

interface RateLimitDocument extends Document {
    key: string;
    hits: number;
    resetTime: Date;
}

const rateLimitSchema = new Schema<RateLimitDocument>({
    key: { type: String, required: true, unique: true },
    hits: { type: Number, required: true, default: 0 },
    resetTime: { type: Date, required: true },
});

rateLimitSchema.index({ resetTime: 1 }, { expireAfterSeconds: 0 });

const RateLimitModel =
    mongoose.models.RateLimit ||
    mongoose.model<RateLimitDocument>("RateLimit", rateLimitSchema);

export class MongoRateLimitStore implements Store {
    private readonly windowMs: number;
    readonly prefix: string;

    constructor(windowMs: number, prefix: string) {
        this.windowMs = windowMs;
        this.prefix = prefix;
    }

    private prefixedKey(key: string): string {
        return `${this.prefix}:${key}`;
    }

    async increment(key: string): Promise<ClientRateLimitInfo> {
        await conectarMongoDB();
        const prefixedKey = this.prefixedKey(key);
        const now = Date.now();
        const newResetTime = new Date(now + this.windowMs);

        const existente = await RateLimitModel.findOne({ key: prefixedKey });
        const janelaExpirada = !existente || existente.resetTime.getTime() <= now;

        const doc = janelaExpirada
            ? await RateLimitModel.findOneAndUpdate(
                { key: prefixedKey },
                { $set: { hits: 1, resetTime: newResetTime } },
                { upsert: true, new: true }
            )
            : await RateLimitModel.findOneAndUpdate(
                { key: prefixedKey },
                { $inc: { hits: 1 } },
                { new: true }
            );

        return {
            totalHits: doc!.hits,
            resetTime: doc!.resetTime,
        };
    }

    async decrement(key: string): Promise<void> {
        await conectarMongoDB();
        await RateLimitModel.findOneAndUpdate({ key: this.prefixedKey(key) }, { $inc: { hits: -1 } });
    }

    async resetKey(key: string): Promise<void> {
        await conectarMongoDB();
        await RateLimitModel.deleteOne({ key: this.prefixedKey(key) });
    }

    async resetAll(): Promise<void> {
        await conectarMongoDB();
        await RateLimitModel.deleteMany({ key: new RegExp(`^${this.prefix}:`) });
    }
}
