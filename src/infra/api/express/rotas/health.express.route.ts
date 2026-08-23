import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
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
    public getMiddlewares() { return []; }

    public getHandler() {
        return async (
            _request: Request,
            response: Response,
            _next: NextFunction
        ): Promise<void> => {
            const tabela = process.env.DYNAMODB_DATA_TABLE || "";
            const region = process.env.DYNAMODB_DATA_REGION || process.env.AWS_REGION || "us-east-1";
            const cliente = new DynamoDBClient({ region });
            let dynamodb = "disconnected";

            try {
                const resultado = await cliente.send(new DescribeTableCommand({ TableName: tabela }));
                dynamodb = resultado.Table?.TableStatus === "ACTIVE" ? "ok" : "degraded";
            } catch {
                dynamodb = "error";
            } finally {
                cliente.destroy();
            }

            const degraded = dynamodb !== "ok";
            response.status(degraded ? 503 : 200).json({
                status: degraded ? "degraded" : "ok",
                dynamodb,
                timestamp: new Date().toISOString(),
            });
        };
    }
}
