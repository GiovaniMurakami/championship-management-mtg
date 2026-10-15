#!/usr/bin/env node
/**
 * Gera versões full + thumb das fotos da galeria no S3 e grava urlThumb no DynamoDB.
 *
 * Uso:
 *   node scripts/gerarVersoesGaleria.mjs
 *   node scripts/gerarVersoesGaleria.mjs --env .env.production
 *   node scripts/gerarVersoesGaleria.mjs --dry-run
 *   node scripts/gerarVersoesGaleria.mjs --force          # refaz mesmo com urlThumb
 *   node scripts/gerarVersoesGaleria.mjs --limit 20
 *   node scripts/gerarVersoesGaleria.mjs --concurrency 4
 *
 * Requer AWS credentials válidas (aws login / profile) e `sharp` instalado.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const require = createRequire(import.meta.url);

const FULL_MAX_EDGE = 2560;
const FULL_QUALITY = 82;
const THUMB_MAX_EDGE = 560;
const THUMB_QUALITY = 72;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");
const envIdx = process.argv.indexOf("--env");
const envFile = envIdx >= 0 ? process.argv[envIdx + 1] : ".env.production";
const limitIdx = process.argv.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : Infinity;
const concIdx = process.argv.indexOf("--concurrency");
const concurrency = Math.max(1, Number(concIdx >= 0 ? process.argv[concIdx + 1] : 4) || 4);

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

const arquivoEnv = carregarEnvArquivo(envFile);
for (const [k, v] of Object.entries(arquivoEnv)) {
  if (process.env[k] == null) process.env[k] = v;
}

const region =
  process.env.AWS_S3_REGION
  || process.env.AWS_REGION
  || process.env.DYNAMODB_DATA_REGION
  || "us-east-1";
const table =
  process.env.DYNAMODB_DATA_TABLE
  || "championship-management-mtg-prod-data";
const bucket = process.env.AWS_S3_BUCKET || "fuguete-championship-management";
const s3Base =
  process.env.AWS_S3_BASE_URL
  || `https://${bucket}.s3.${region}.amazonaws.com`;

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("Instale sharp: npm install --save-dev sharp");
  process.exit(1);
}

const dynamo = new DynamoDBClient({ region });
const s3 = new S3Client({
  region,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

function urlParaChave(url) {
  const base = `${s3Base}/`;
  if (!url.startsWith(base)) {
    // fallback: path após bucket hostname
    const m = url.match(/\.amazonaws\.com\/(.+)$/);
    if (!m) throw new Error(`URL fora do bucket esperado: ${url}`);
    return decodeURIComponent(m[1].split("?")[0]);
  }
  return decodeURIComponent(url.slice(base.length).split("?")[0]);
}

function chaveThumb(chaveFull) {
  if (/-thumb\.webp$/i.test(chaveFull)) return chaveFull;
  return chaveFull.replace(/\.webp$/i, "-thumb.webp");
}

function chaveParaUrl(chave) {
  return `${s3Base}/${chave}`;
}

async function listarFotosGaleria() {
  const fotos = [];
  let ExclusiveStartKey;
  do {
    const res = await dynamo.send(new QueryCommand({
      TableName: table,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": { S: "GALERIA" },
        ":sk": { S: "ITEM#" },
      },
      ExclusiveStartKey,
    }));
    for (const item of res.Items || []) {
      if (!item.payload?.S) continue;
      const payload = JSON.parse(item.payload.S);
      if (!payload?.id || !payload?.url) continue;
      fotos.push({
        pk: item.pk.S,
        sk: item.sk.S,
        entity: item.entity?.S,
        payload,
      });
    }
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return fotos;
}

async function baixarS3(chave) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: chave }));
  const bytes = await res.Body.transformToByteArray();
  return Buffer.from(bytes);
}

async function existeS3(chave) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: chave }));
    return true;
  } catch {
    return false;
  }
}

async function enviarS3(chave, buffer) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: chave,
    Body: buffer,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }));
}

async function otimizar(buffer, maxEdge, quality) {
  const img = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const w = meta.width || maxEdge;
  const h = meta.height || maxEdge;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));
  return img
    .resize(width, height, { fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer();
}

async function atualizarPayload(foto, urlThumb) {
  const novo = { ...foto.payload, urlThumb };
  const extras = {};
  if (foto.entity) extras.entity = { S: foto.entity };
  await dynamo.send(new UpdateItemCommand({
    TableName: table,
    Key: { pk: { S: foto.pk }, sk: { S: foto.sk } },
    UpdateExpression: "SET payload = :payload",
    ExpressionAttributeValues: {
      ":payload": { S: JSON.stringify(novo) },
    },
  }));
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function mapPool(items, size, worker) {
  let i = 0;
  const results = [];
  async function run() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, () => run()));
  return results;
}

console.log(`Tabela: ${table}`);
console.log(`Bucket: ${bucket} (${region})`);
console.log(`Base URL: ${s3Base}`);
console.log(`Modo: ${dryRun ? "dry-run" : "aplicar"}${force ? " + force" : ""}`);
console.log(`Concurrency: ${concurrency}`);

const todas = await listarFotosGaleria();
const alvo = todas.slice(0, Number.isFinite(limit) ? limit : todas.length);
console.log(`Fotos na galeria: ${todas.length} | processar: ${alvo.length}`);

let ok = 0;
let skip = 0;
let falhas = 0;

await mapPool(alvo, concurrency, async (foto) => {
  const id = foto.payload.id;
  const titulo = foto.payload.titulo || id;
  try {
    if (foto.payload.urlThumb && !force) {
      const thumbKey = urlParaChave(foto.payload.urlThumb);
      if (await existeS3(thumbKey)) {
        skip += 1;
        console.log(`⏭  ${id} já tem thumb`);
        return;
      }
    }

    const chaveFull = urlParaChave(foto.payload.url);
    const chaveTh = chaveThumb(chaveFull);
    const original = await baixarS3(chaveFull);

    const [fullBuf, thumbBuf] = await Promise.all([
      otimizar(original, FULL_MAX_EDGE, FULL_QUALITY),
      otimizar(original, THUMB_MAX_EDGE, THUMB_QUALITY),
    ]);

    const urlThumb = chaveParaUrl(chaveTh);
    console.log(
      `✓  ${titulo.slice(0, 40)}  full ${fmt(original.length)}→${fmt(fullBuf.length)}  thumb ${fmt(thumbBuf.length)}`,
    );

    if (dryRun) {
      ok += 1;
      return;
    }

    await Promise.all([
      enviarS3(chaveFull, fullBuf),
      enviarS3(chaveTh, thumbBuf),
    ]);
    await atualizarPayload(foto, urlThumb);
    ok += 1;
  } catch (erro) {
    falhas += 1;
    console.error(`✗  ${id}: ${erro?.message || erro}`);
  }
});

console.log(`\nConcluído: ${ok} ok | ${skip} ignoradas | ${falhas} falhas`);
if (dryRun) console.log("(dry-run: nada foi gravado no S3/Dynamo)");
process.exit(falhas > 0 ? 1 : 0);
