import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { HttpMethod, Rotas } from "./rotas";

export class HealthRota implements Rotas {
    private constructor(
        private readonly caminho: string,
        private readonly metodo: HttpMethod
    ) { }

    public static criar() {
        return new HealthRota("/health", HttpMethod.GET);
    }

    public getCaminho(): string { return this.caminho; }
    public getMetodo(): HttpMethod { return this.metodo; }
    public getMiddlewares() { return []; }

    public getHandler() {
        return async (
            _request: Request,
            response: Response,
            _next: NextFunction
        ): Promise<void> => {
            let mongoStatus = "unknown";
            try {
                if (mongoose.connection.readyState === 1) {
                    await mongoose.connection.db!.admin().command({ ping: 1 });
                    mongoStatus = "ok";
                } else {
                    mongoStatus = "disconnected";
                }
            } catch {
                mongoStatus = "error";
            }

            const degraded = mongoStatus !== "ok";
            response.status(degraded ? 503 : 200).json({
                status: degraded ? "degraded" : "ok",
                mongo: mongoStatus,
                timestamp: new Date().toISOString(),
            });
        };
    }
}
