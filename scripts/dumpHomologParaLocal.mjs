#!/usr/bin/env node
/**
 * Copia DynamoDB homolog (dev-data/cache) → local-data/cache.
 * Uso:
 *   node scripts/dumpHomologParaLocal.mjs
 *   node scripts/dumpHomologParaLocal.mjs --truncate
 *   node scripts/dumpHomologParaLocal.mjs --dry-run
 *   node scripts/dumpHomologParaLocal.mjs --skip-cache
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  BatchWriteItemCommand,
  DynamoDBClient,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

const dryRun = process.argv.includes("--dry-run");
const truncate = process.argv.includes("--truncate");
const skipCache = process.argv.includes("--skip-cache");
const region = process.env.AWS_REGION || process.env.DYNAMODB_DATA_REGION || "us-east-1";

function carregarEnvArquivo(nome) {
  const caminho = resolve(process.cwd(), nome);
  if (!existsSync(caminho)) return {};
  const out = {};
  for (const linha of readFileSync(caminho, "utf8").split("\n")) {
    const t = linha.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const chave = t.slice(0, i).trim();
    let valor = t.slice(i + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"'))
      || (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    out[chave] = valor;
  }
  return out;
}

const envHomolog = carregarEnvArquivo(".env.homolog");
const envLocal = carregarEnvArquivo(".env.local");

const origemData = process.env.DUMP_SOURCE_DATA_TABLE
  || envHomolog.DYNAMODB_DATA_TABLE
  || "championship-management-mtg-dev-data";
const destinoData = process.env.DUMP_TARGET_DATA_TABLE
  || envLocal.DYNAMODB_DATA_TABLE
  || "championship-management-mtg-local-data";
const origemCache = process.env.DUMP_SOURCE_CACHE_TABLE
  || envHomolog.DYNAMODB_CACHE_TABLE
  || "championship-management-mtg-dev-cache";
const destinoCache = process.env.DUMP_TARGET_CACHE_TABLE
  || envLocal.DYNAMODB_CACHE_TABLE
  || "championship-management-mtg-local-cache";

function assertDestinoLocal(tabela) {
  if (!/(local|test)/i.test(tabela)) {
    throw new Error(
      `Destino bloqueado: tabela deve conter "local" ou "test"; recebido: ${tabela || "vazio"}`
    );
  }
}

async function limparTabela(cliente, tabela) {
  assertDestinoLocal(tabela);
  let removidos = 0;
  let cursor;
  do {
    const pagina = await cliente.send(new ScanCommand({
      TableName: tabela,
      ProjectionExpression: "pk, sk",
      ExclusiveStartKey: cursor,
      ConsistentRead: true,
    }));
    const chaves = pagina.Items ?? [];
    for (let i = 0; i < chaves.length; i += 25) {
      let pendentes = chaves.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } }));
      for (let tentativa = 0; pendentes.length > 0 && tentativa < 8; tentativa += 1) {
        const resposta = await cliente.send(new BatchWriteItemCommand({
          RequestItems: { [tabela]: pendentes },
        }));
        pendentes = resposta.UnprocessedItems?.[tabela] ?? [];
        if (pendentes.length) {
          await new Promise((r) => setTimeout(r, Math.min(1000, 50 * 2 ** tentativa)));
        }
      }
      if (pendentes.length) {
        throw new Error(`${pendentes.length} item(ns) não removido(s) em ${tabela}`);
      }
      removidos += Math.min(25, chaves.length - i);
      if (removidos % 500 === 0 && removidos > 0) {
        console.log(`[truncate] ${tabela}: ${removidos} removido(s)...`);
      }
    }
    cursor = pagina.LastEvaluatedKey;
  } while (cursor);
  return removidos;
}

async function copiarTabela(cliente, origem, destino) {
  assertDestinoLocal(destino);
  let lidos = 0;
  let gravados = 0;
  let cursor;
  do {
    const pagina = await cliente.send(new ScanCommand({
      TableName: origem,
      ExclusiveStartKey: cursor,
      ConsistentRead: true,
    }));
    const itens = pagina.Items ?? [];
    lidos += itens.length;

    if (!dryRun) {
      for (let i = 0; i < itens.length; i += 25) {
        let pendentes = itens.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } }));
        for (let tentativa = 0; pendentes.length > 0 && tentativa < 8; tentativa += 1) {
          const resposta = await cliente.send(new BatchWriteItemCommand({
            RequestItems: { [destino]: pendentes },
          }));
          const processados = pendentes.length - (resposta.UnprocessedItems?.[destino]?.length ?? 0);
          gravados += processados;
          pendentes = resposta.UnprocessedItems?.[destino] ?? [];
          if (pendentes.length) {
            await new Promise((r) => setTimeout(r, Math.min(1000, 50 * 2 ** tentativa)));
          }
        }
        if (pendentes.length) {
          throw new Error(`${pendentes.length} item(ns) não gravado(s) em ${destino}`);
        }
      }
    }

    if (lidos % 1000 === 0 && lidos > 0) {
      console.log(`[copy] ${origem} → ${destino}: lidos=${lidos}${dryRun ? " (dry-run)" : `, gravados=${gravados}`}`);
    }
    cursor = pagina.LastEvaluatedKey;
  } while (cursor);

  return { lidos, gravados: dryRun ? 0 : gravados };
}

async function main() {
  assertDestinoLocal(destinoData);
  if (!skipCache) assertDestinoLocal(destinoCache);

  console.log("Dump homolog → local");
  console.log(`  região: ${region}`);
  console.log(`  data:   ${origemData} → ${destinoData}`);
  if (!skipCache) console.log(`  cache:  ${origemCache} → ${destinoCache}`);
  console.log(`  flags:  dryRun=${dryRun} truncate=${truncate} skipCache=${skipCache}`);

  const cliente = new DynamoDBClient({ region });
  try {
    if (truncate && !dryRun) {
      const nData = await limparTabela(cliente, destinoData);
      console.log(`[truncate] ${destinoData}: ${nData} removido(s)`);
      if (!skipCache) {
        const nCache = await limparTabela(cliente, destinoCache);
        console.log(`[truncate] ${destinoCache}: ${nCache} removido(s)`);
      }
    }

    const rData = await copiarTabela(cliente, origemData, destinoData);
    console.log(`[ok] data: lidos=${rData.lidos} gravados=${rData.gravados}`);

    if (!skipCache) {
      const rCache = await copiarTabela(cliente, origemCache, destinoCache);
      console.log(`[ok] cache: lidos=${rCache.lidos} gravados=${rCache.gravados}`);
    }
  } finally {
    cliente.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
