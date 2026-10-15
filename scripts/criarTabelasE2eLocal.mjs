#!/usr/bin/env node
/**
 * Cria tabelas pk/sk (data + cache) no DynamoDB Local / endpoint configurado.
 * Uso: DYNAMODB_ENDPOINT=http://127.0.0.1:8000 node scripts/criarTabelasE2eLocal.mjs
 */
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceInUseException,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";

const endpoint = process.env.DYNAMODB_ENDPOINT?.trim();
const region = process.env.AWS_REGION || "us-east-1";
const dataTable = process.env.DYNAMODB_DATA_TABLE || "championship-management-mtg-ci-test-data";
const cacheTable = process.env.DYNAMODB_CACHE_TABLE || "championship-management-mtg-ci-test-cache";

const cliente = new DynamoDBClient({
  region,
  ...(endpoint
    ? {
        endpoint,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
        },
      }
    : {}),
});

async function garantirTabela(nome) {
  try {
    await cliente.send(new DescribeTableCommand({ TableName: nome }));
    console.log(`Tabela já existe: ${nome}`);
    return;
  } catch (erro) {
    if (erro?.name !== "ResourceNotFoundException") throw erro;
  }

  try {
    await cliente.send(
      new CreateTableCommand({
        TableName: nome,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "pk", AttributeType: "S" },
          { AttributeName: "sk", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "pk", KeyType: "HASH" },
          { AttributeName: "sk", KeyType: "RANGE" },
        ],
      })
    );
  } catch (erro) {
    if (!(erro instanceof ResourceInUseException) && erro?.name !== "ResourceInUseException") {
      throw erro;
    }
  }

  await waitUntilTableExists({ client: cliente, maxWaitTime: 60 }, { TableName: nome });
  console.log(`Tabela pronta: ${nome}`);
}

await garantirTabela(dataTable);
await garantirTabela(cacheTable);
cliente.destroy();
console.log(`OK endpoint=${endpoint || "AWS"} data=${dataTable} cache=${cacheTable}`);
