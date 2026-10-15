import { DynamoDBClient, type DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";

/**
 * Cliente DynamoDB compartilhado.
 * Com `DYNAMODB_ENDPOINT` (ex.: DynamoDB Local no CI) usa endpoint + credentials dummy.
 */
export function criarClienteDynamo(region?: string): DynamoDBClient {
  const endpoint = process.env.DYNAMODB_ENDPOINT?.trim();
  const regiao =
    region ||
    process.env.DYNAMODB_DATA_REGION ||
    process.env.DYNAMODB_CACHE_REGION ||
    process.env.AWS_REGION ||
    process.env.AWS_S3_REGION ||
    "us-east-1";

  const config: DynamoDBClientConfig = { region: regiao };

  if (endpoint) {
    config.endpoint = endpoint;
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
    };
  }

  return new DynamoDBClient(config);
}
