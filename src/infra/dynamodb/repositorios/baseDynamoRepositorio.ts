import {
  BatchWriteItemCommand,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand,
  type AttributeValue,
  type WriteRequest,
} from "@aws-sdk/client-dynamodb";
import { logger } from "../../../helpers/logger";

type DynamoItem = Record<string, AttributeValue>;
type DynamoWriteRequest = WriteRequest;

export abstract class BaseDynamoRepositorio {
  protected readonly cliente: DynamoDBClient;
  protected readonly tabela: string;

  protected constructor() {
    this.tabela = process.env.DYNAMODB_DATA_TABLE || "";
    const region = process.env.DYNAMODB_DATA_REGION || process.env.AWS_REGION || process.env.AWS_S3_REGION;
    this.cliente = new DynamoDBClient(region ? { region } : {});
  }

  protected assertTabelaConfigurada(): void {
    if (!this.tabela) {
      throw new Error("Variável de ambiente obrigatória não definida: DYNAMODB_DATA_TABLE");
    }
  }

  protected async putJson<T>(
    pk: string,
    sk: string,
    payload: T,
    extras: Record<string, string | number | Date | undefined> = {}
  ): Promise<void> {
    this.assertTabelaConfigurada();
    await this.cliente.send(new PutItemCommand({
      TableName: this.tabela,
      Item: {
        pk: { S: pk },
        sk: { S: sk },
        payload: { S: JSON.stringify(payload) },
        ...this.extrasParaItem(extras),
      },
    }));
  }

  protected toPutRequest<T>(
    pk: string,
    sk: string,
    payload: T,
    extras: Record<string, string | number | Date | undefined> = {}
  ): DynamoWriteRequest {
    return {
      PutRequest: {
        Item: {
          pk: { S: pk },
          sk: { S: sk },
          payload: { S: JSON.stringify(payload) },
          ...this.extrasParaItem(extras),
        },
      },
    };
  }

  protected toDeleteRequest(pk: string, sk: string): DynamoWriteRequest {
    return {
      DeleteRequest: {
        Key: {
          pk: { S: pk },
          sk: { S: sk },
        },
      },
    };
  }

  protected async batchWrite(requests: DynamoWriteRequest[]): Promise<void> {
    this.assertTabelaConfigurada();
    for (let i = 0; i < requests.length; i += 25) {
      let pendentes = requests.slice(i, i + 25);
      for (let tentativa = 0; pendentes.length > 0; tentativa += 1) {
        const resposta = await this.cliente.send(new BatchWriteItemCommand({
          RequestItems: {
            [this.tabela]: pendentes,
          },
        }));
        pendentes = resposta.UnprocessedItems?.[this.tabela] ?? [];
        if (pendentes.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(1000, 50 * 2 ** tentativa)));
        }
      }
    }
  }

  protected async transactPutJson<T>(
    itens: Array<{ pk: string; sk: string; payload: T; extras?: Record<string, string | number | Date | undefined> }>
  ): Promise<void> {
    this.assertTabelaConfigurada();
    for (let i = 0; i < itens.length; i += 100) {
      await this.cliente.send(new TransactWriteItemsCommand({
        TransactItems: itens.slice(i, i + 100).map((item) => ({
          Put: {
            TableName: this.tabela,
            Item: {
              pk: { S: item.pk },
              sk: { S: item.sk },
              payload: { S: JSON.stringify(item.payload) },
              ...this.extrasParaItem(item.extras ?? {}),
            },
          },
        })),
      }));
    }
  }

  protected async getJson<T>(pk: string, sk: string): Promise<T | null> {
    this.assertTabelaConfigurada();
    const resposta = await this.cliente.send(new GetItemCommand({
      TableName: this.tabela,
      Key: {
        pk: { S: pk },
        sk: { S: sk },
      },
    }));

    return this.itemParaJson<T>(resposta.Item);
  }

  protected async queryJson<T>(pk: string): Promise<T[]> {
    this.assertTabelaConfigurada();
    const resposta = await this.cliente.send(new QueryCommand({
      TableName: this.tabela,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: pk },
      },
    }));

    return (resposta.Items ?? [])
      .map((item) => this.itemParaJson<T>(item))
      .filter((item): item is T => item !== null);
  }

  protected async delete(pk: string, sk: string): Promise<void> {
    this.assertTabelaConfigurada();
    await this.cliente.send(new DeleteItemCommand({
      TableName: this.tabela,
      Key: {
        pk: { S: pk },
        sk: { S: sk },
      },
    }));
  }

  protected async updatePayloadIf(
    pk: string,
    sk: string,
    payload: unknown,
    conditionExpression?: string,
    expressionAttributeValues?: Record<string, { S?: string; N?: string; BOOL?: boolean }>,
    setAttrs: Record<string, string | number | boolean | undefined> = {}
  ): Promise<boolean> {
    this.assertTabelaConfigurada();
    try {
      const attrEntries = Object.entries(setAttrs).filter(([, value]) => value !== undefined);
      await this.cliente.send(new UpdateItemCommand({
        TableName: this.tabela,
        Key: {
          pk: { S: pk },
          sk: { S: sk },
        },
        UpdateExpression: [
          "payload = :payload",
          ...attrEntries.map(([key]) => `#${key} = :set_${key}`),
        ].join(", ").replace(/^/, "SET "),
        ConditionExpression: conditionExpression,
        ExpressionAttributeNames: attrEntries.length > 0
          ? attrEntries.reduce<Record<string, string>>((acc, [key]) => {
            acc[`#${key}`] = key;
            return acc;
          }, {})
          : undefined,
        ExpressionAttributeValues: {
          ":payload": { S: JSON.stringify(payload) },
          ...attrEntries.reduce<Record<string, { S?: string; N?: string; BOOL?: boolean }>>((acc, [key, value]) => {
            if (typeof value === "number") acc[`:set_${key}`] = { N: String(value) };
            else if (typeof value === "boolean") acc[`:set_${key}`] = { BOOL: value };
            else if (typeof value === "string") acc[`:set_${key}`] = { S: value };
            return acc;
          }, {}),
          ...(expressionAttributeValues ?? {}),
        },
      }));
      return true;
    } catch (error) {
      const nome = (error as { name?: string }).name;
      if (nome === "ConditionalCheckFailedException") return false;
      throw error;
    }
  }

  protected async safeDelete(pk: string, sk: string): Promise<void> {
    try {
      await this.delete(pk, sk);
    } catch (error) {
      logger.warn({ err: error, pk, sk }, "falha ao remover item DynamoDB");
    }
  }

  private itemParaJson<T>(item?: DynamoItem): T | null {
    if (!item?.payload?.S) return null;
    return JSON.parse(item.payload.S) as T;
  }

  private extrasParaItem(extras: Record<string, string | number | Date | undefined>): DynamoItem {
    return Object.entries(extras).reduce<DynamoItem>((acc, [key, value]) => {
      if (value === undefined) return acc;
      if (value instanceof Date) {
        acc[key] = { N: String(Math.floor(value.getTime() / 1000)) };
      } else if (typeof value === "number") {
        acc[key] = { N: String(value) };
      } else {
        acc[key] = { S: value };
      }
      return acc;
    }, {});
  }
}
