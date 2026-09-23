#!/usr/bin/env node
/**
 * Carrega .env.homolog | .env.production e roda serverless deploy.
 * Stages AWS continuam `dev` / `prod` (nomes históricos das stacks).
 */
import { spawnSync } from "node:child_process";
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
const loaded = config({ path: envFile, override: true });
if (loaded.error) {
  console.error(`Falha ao carregar ${envFile}: ${loaded.error.message}`);
  process.exit(1);
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
