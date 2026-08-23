import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { IncrementResponse, Options, Store } from "express-rate-limit";

export class DynamoRateLimitStore implements Store {
  public readonly localKeys = false;
  public readonly prefix: string;
  private readonly cliente: DynamoDBClient;
  private readonly tabela: string;
  private windowMs = 15 * 60 * 1000;

  public constructor(prefix: string) {
    this.prefix = `rate-limit:${prefix}:`;
    this.tabela = process.env.DYNAMODB_CACHE_TABLE ?? "";
    const region = process.env.DYNAMODB_CACHE_REGION || process.env.AWS_REGION || "us-east-1";
    this.cliente = new DynamoDBClient({ region });
  }

  public init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  public async increment(key: string): Promise<IncrementResponse> {
    this.assertConfigurado();
    for (;;) {
      const agora = Math.floor(Date.now() / 1000);
      const novoExpiresAt = agora + Math.ceil(this.windowMs / 1000);
      try {
        const resposta = await this.cliente.send(new UpdateItemCommand({
          TableName: this.tabela,
          Key: this.chave(key),
          UpdateExpression: "SET #hits = if_not_exists(#hits, :zero) + :one, expiresAt = if_not_exists(expiresAt, :expiresAt)",
          ConditionExpression: "attribute_not_exists(expiresAt) OR expiresAt > :agora",
          ExpressionAttributeNames: { "#hits": "totalHits" },
          ExpressionAttributeValues: {
            ":zero": { N: "0" },
            ":one": { N: "1" },
            ":agora": { N: String(agora) },
            ":expiresAt": { N: String(novoExpiresAt) },
          },
          ReturnValues: "ALL_NEW",
        }));
        const totalHits = Number(resposta.Attributes?.totalHits?.N ?? 1);
        const expiresAt = Number(resposta.Attributes?.expiresAt?.N ?? novoExpiresAt);
        return { totalHits, resetTime: new Date(expiresAt * 1000) };
      } catch (error) {
        if ((error as { name?: string }).name !== "ConditionalCheckFailedException") throw error;
        await this.removerExpirado(key, agora);
      }
    }
  }

  public async get(key: string): Promise<IncrementResponse | undefined> {
    this.assertConfigurado();
    const resposta = await this.cliente.send(new GetItemCommand({
      TableName: this.tabela,
      Key: this.chave(key),
      ConsistentRead: true,
    }));
    const expiresAt = Number(resposta.Item?.expiresAt?.N ?? 0);
    if (!expiresAt || expiresAt <= Math.floor(Date.now() / 1000)) return undefined;
    return {
      totalHits: Number(resposta.Item?.totalHits?.N ?? 0),
      resetTime: new Date(expiresAt * 1000),
    };
  }

  public async decrement(key: string): Promise<void> {
    this.assertConfigurado();
    try {
      await this.cliente.send(new UpdateItemCommand({
        TableName: this.tabela,
        Key: this.chave(key),
        UpdateExpression: "ADD #hits :menosUm",
        ConditionExpression: "#hits > :zero",
        ExpressionAttributeNames: { "#hits": "totalHits" },
        ExpressionAttributeValues: { ":menosUm": { N: "-1" }, ":zero": { N: "0" } },
      }));
    } catch (error) {
      if ((error as { name?: string }).name !== "ConditionalCheckFailedException") throw error;
    }
  }

  public async resetKey(key: string): Promise<void> {
    this.assertConfigurado();
    await this.cliente.send(new DeleteItemCommand({ TableName: this.tabela, Key: this.chave(key) }));
  }

  public shutdown(): void {
    this.cliente.destroy();
  }

  private async removerExpirado(key: string, agora: number): Promise<void> {
    try {
      await this.cliente.send(new DeleteItemCommand({
        TableName: this.tabela,
        Key: this.chave(key),
        ConditionExpression: "expiresAt <= :agora",
        ExpressionAttributeValues: { ":agora": { N: String(agora) } },
      }));
    } catch (error) {
      if ((error as { name?: string }).name !== "ConditionalCheckFailedException") throw error;
    }
  }

  private chave(key: string) {
    return { pk: { S: `RATE_LIMIT#${this.prefix}` }, sk: { S: key } };
  }

  private assertConfigurado(): void {
    if (!this.tabela) throw new Error("DYNAMODB_CACHE_TABLE nao configurada para rate limit distribuido");
  }
}
