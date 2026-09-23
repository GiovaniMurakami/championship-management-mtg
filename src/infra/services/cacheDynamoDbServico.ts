import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";
import { dependenciasCache, dominioParticao } from "../../helpers/cache/dependenciasCache";
import { resolverTabelaCacheDynamo } from "../../helpers/dynamodbTabelas";
import { logger } from "../../helpers/logger";
import { comRetry } from "../../helpers/retry";

const VERSOES_KEY = { pk: { S: "__cache_versions" }, sk: { S: "v1" } };

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
    const tabela = resolverTabelaCacheDynamo();
    const habilitado = process.env.DYNAMODB_CACHE_ENABLED !== "false" && Boolean(tabela);
    const region = process.env.DYNAMODB_CACHE_REGION || process.env.AWS_REGION || process.env.AWS_S3_REGION;
    return new CacheDynamoDbServico(tabela, habilitado, region);
  }

  public async buscar<T>(pk: string, sk: string, versao?: string | null): Promise<T | null> {
    if (!this.habilitado) return null;

    try {
      const versaoAtual = versao === undefined ? await this.obterVersao(pk) : versao;
      if (versaoAtual === null) return null;
      const resposta = await this.cliente.send(new GetItemCommand({
        ConsistentRead: true,
        TableName: this.tabela,
        Key: {
          pk: { S: pk },
          sk: { S: sk },
        },
      }));

      const item = resposta.Item;
      if (!item?.payload?.S || !item?.expiresAt?.N || item.versao?.S !== versaoAtual) return null;

      if (Number(item.expiresAt.N) <= Math.floor(Date.now() / 1000)) {
        return null;
      }

      return JSON.parse(item.payload.S) as T;
    } catch (error) {
      logger.warn({ err: error, pk, sk }, "falha ao ler cache DynamoDB");
      return null;
    }
  }

  public async salvar<T>(pk: string, sk: string, valor: T, ttlSegundos: number, versao?: string | null): Promise<void> {
    if (!this.habilitado) return;

    const now = Math.floor(Date.now() / 1000);
    try {
      const versaoAtual = await this.obterVersao(pk);
      if (versaoAtual === null || (versao !== undefined && versao !== versaoAtual)) return;
      await this.cliente.send(new PutItemCommand({
        TableName: this.tabela,
        Item: {
          pk: { S: pk },
          sk: { S: sk },
          payload: { S: JSON.stringify(valor) },
          versao: { S: versaoAtual },
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

  /** Capturada antes de ler os dados; não compartilha estado entre requisições. */
  public async obterVersao(pk: string): Promise<string | null> {
    if (!this.habilitado) return null;
    try {
      const resposta = await this.cliente.send(new GetItemCommand({
        TableName: this.tabela,
        Key: VERSOES_KEY,
        ConsistentRead: true,
      }));
      return JSON.stringify(dependenciasCache(pk).map((dominio) => resposta.Item?.[dominio]?.S ?? "0"));
    } catch (error) {
      logger.warn({ err: error, pk }, "falha ao ler versao do cache DynamoDB");
      return null;
    }
  }

  /** Sem TTL: uma geração antiga nunca pode voltar a ser válida. */
  public async invalidarDependencias(dominios: string[]): Promise<void> {
    if (!this.habilitado || dominios.length === 0) return;
    const unicos = [...new Set(dominios)];
    try {
      await comRetry(
        () => this.cliente.send(new UpdateItemCommand({
          TableName: this.tabela,
          Key: VERSOES_KEY,
          UpdateExpression: "SET " + unicos.map((_, i) => `#d${i} = :v${i}`).join(", "),
          ExpressionAttributeNames: Object.fromEntries(unicos.map((dominio, i) => [`#d${i}`, dominio])),
          ExpressionAttributeValues: Object.fromEntries(unicos.map((_, i) => [`:v${i}`, { S: randomUUID() }])),
        })),
        3,
        100,
      );
    } catch (error) {
      logger.error({ err: error, dominios }, "falha ao invalidar cache DynamoDB apos escrita");
      throw error;
    }
  }

  public async invalidarParticao(pk: string): Promise<void> {
    await this.invalidarDependencias([dominioParticao(pk)]);
  }
}

export function getCacheTtlSegundos(nomeEnv: string, padrao: number): number {
  const valor = Number(process.env[nomeEnv]);
  return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : padrao;
}
