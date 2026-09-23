import dotenv from "dotenv";
import path from "node:path";

const AMBIENTES = ["local", "homolog", "production"] as const;
export type AmbienteApp = (typeof AMBIENTES)[number];

const ALIASES: Record<string, AmbienteApp> = {
  local: "local",
  development: "local",
  dev: "homolog",
  homolog: "homolog",
  staging: "homolog",
  production: "production",
  prod: "production",
};

export function resolverAmbienteApp(valor = process.env.APP_ENV): AmbienteApp {
  const chave = String(valor || "local").trim().toLowerCase();
  return ALIASES[chave] || "local";
}

export function caminhoEnv(ambiente = resolverAmbienteApp()): string {
  return path.resolve(process.cwd(), `.env.${ambiente}`);
}

/** Carrega `.env.local` | `.env.homolog` | `.env.production` conforme `APP_ENV`. */
export function carregarEnv(opcoes?: { ambiente?: AmbienteApp; override?: boolean }): AmbienteApp {
  const ambiente = opcoes?.ambiente || resolverAmbienteApp();
  dotenv.config({
    path: caminhoEnv(ambiente),
    override: opcoes?.override ?? false,
  });
  process.env.APP_ENV = ambiente;
  return ambiente;
}
