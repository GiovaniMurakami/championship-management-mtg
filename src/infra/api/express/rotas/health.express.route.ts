import { NextFunction, Request, Response } from "express";
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

    public getHandler() {
        return async (
            _request: Request,
            response: Response,
            _next: NextFunction
        ): Promise<void> => {
            response.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
        };
    }
}
