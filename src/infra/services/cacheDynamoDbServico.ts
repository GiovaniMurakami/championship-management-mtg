import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { logger } from "../../helpers/logger";

export type CacheDynamoDbItem<T> = {
  valor: T;
  criadoEm: string;
};

export class CacheDynamoDbServico {
  private readonly cliente: DynamoDBClient;

  private constructor(
    private readonly tabela: string,
    private readonly habilitado: boolean,
    region?: string
  ) {
    this.cliente = new DynamoDBClient(region ? { region } : {});
  }

  public static criar(): CacheDynamoDbServico {
    const tabela = process.env.DYNAMODB_CACHE_TABLE || "";
    const habilitado = process.env.DYNAMODB_CACHE_ENABLED !== "false" && Boolean(tabela);
    const region = process.env.DYNAMODB_CACHE_REGION || process.env.AWS_REGION || process.env.AWS_S3_REGION;
    return new CacheDynamoDbServico(tabela, habilitado, region);
  }

  public async buscar<T>(pk: string, sk: string): Promise<T | null> {
    if (!this.habilitado) return null;

    try {
      const resposta = await this.cliente.send(new GetItemCommand({
        TableName: this.tabela,
        Key: {
          pk: { S: pk },
          sk: { S: sk },
        },
      }));

      const item = resposta.Item;
      if (!item?.payload?.S || !item?.expiresAt?.N) return null;

      if (Number(item.expiresAt.N) <= Math.floor(Date.now() / 1000)) {
        await this.remover(pk, sk);
        return null;
      }

      return JSON.parse(item.payload.S) as T;
    } catch (error) {
      logger.warn({ err: error, pk, sk }, "falha ao ler cache DynamoDB");
      return null;
    }
  }

  public async salvar<T>(pk: string, sk: string, valor: T, ttlSegundos: number): Promise<void> {
    if (!this.habilitado) return;

    const now = Math.floor(Date.now() / 1000);
    try {
      await this.cliente.send(new PutItemCommand({
        TableName: this.tabela,
        Item: {
          pk: { S: pk },
          sk: { S: sk },
          payload: { S: JSON.stringify(valor) },
          createdAt: { N: String(now) },
          expiresAt: { N: String(now + ttlSegundos) },
        },
      }));
    } catch (error) {
      logger.warn({ err: error, pk, sk }, "falha ao gravar cache DynamoDB");
    }
  }

  public async remover(pk: string, sk: string): Promise<void> {
    if (!this.habilitado) return;

    try {
      await this.cliente.send(new DeleteItemCommand({
        TableName: this.tabela,
        Key: {
          pk: { S: pk },
          sk: { S: sk },
        },
      }));
    } catch (error) {
      logger.warn({ err: error, pk, sk }, "falha ao remover item do cache DynamoDB");
    }
  }

  public async invalidarParticao(pk: string): Promise<void> {
    if (!this.habilitado) return;

    try {
      let lastEvaluatedKey: Record<string, { S: string }> | undefined;
      do {
        const resposta = await this.cliente.send(new QueryCommand({
          TableName: this.tabela,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: {
            ":pk": { S: pk },
          },
          ProjectionExpression: "pk, sk",
          ExclusiveStartKey: lastEvaluatedKey,
        }));

        const itens = resposta.Items ?? [];
        await Promise.all(itens.map((item) => {
          const sk = item.sk?.S;
          if (!sk) return Promise.resolve();
          return this.remover(pk, sk);
        }));

        lastEvaluatedKey = resposta.LastEvaluatedKey as Record<string, { S: string }> | undefined;
      } while (lastEvaluatedKey);
    } catch (error) {
      logger.warn({ err: error, pk }, "falha ao invalidar particao do cache DynamoDB");
    }
  }
}

export function getCacheTtlSegundos(nomeEnv: string, padrao: number): number {
  const valor = Number(process.env[nomeEnv]);
  return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : padrao;
}
