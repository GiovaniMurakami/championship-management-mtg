#!/usr/bin/env node
/**
 * Carrega .env.homolog | .env.production (quando existir) e roda serverless deploy.
 * No CI as variáveis vêm do GitHub Environment — o arquivo .env* é opcional.
 * Stages AWS continuam `dev` / `prod` (nomes históricos das stacks).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { config } from "dotenv";
import path from "node:path";

const stage = String(process.argv[2] || "").trim();
const stageParaEnv = {
  dev: "homolog",
  homolog: "homolog",
  prod: "production",
  production: "production",
};
const appEnv = stageParaEnv[stage];
if (!appEnv) {
  console.error("Uso: node scripts/deploy.mjs <dev|homolog|prod|production>");
  process.exit(1);
}

const awsStage = appEnv === "homolog" ? "dev" : "prod";
const envFile = path.resolve(process.cwd(), `.env.${appEnv}`);
const noCi = !process.env.GITHUB_ACTIONS && !process.env.CI;

if (existsSync(envFile)) {
  const loaded = config({ path: envFile, override: true });
  if (loaded.error) {
    console.error(`Falha ao carregar ${envFile}: ${loaded.error.message}`);
    process.exit(1);
  }
  console.log(`Carregou ${path.basename(envFile)}`);
} else if (noCi) {
  console.error(
    `Arquivo ${envFile} não encontrado. Crie .env.${appEnv} para deploy local, `
    + "ou rode no CI com as variáveis do GitHub Environment."
  );
  process.exit(1);
} else {
  console.log(
    `.env.${appEnv} ausente — usando variáveis de ambiente do CI (GitHub Environment).`
  );
}

process.env.APP_ENV = appEnv;

const build = spawnSync("npm", ["run", "build"], { stdio: "inherit", env: process.env, shell: true });
if (build.status !== 0) process.exit(build.status ?? 1);

const deploy = spawnSync(
  "npx",
  ["serverless", "deploy", "--stage", awsStage, "--region", "us-east-1"],
  { stdio: "inherit", env: process.env, shell: true },
);
process.exit(deploy.status ?? 1);
