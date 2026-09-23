import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import path from "node:path";

const aliases = {
  local: "local",
  development: "local",
  dev: "homolog",
  homolog: "homolog",
  staging: "homolog",
  production: "production",
  prod: "production",
};
const appEnv = aliases[String(process.env.APP_ENV || "local").toLowerCase()] || "local";
config({ path: path.resolve(process.cwd(), `.env.${appEnv}`) });
process.env.APP_ENV = appEnv;

const [file, ...pairs] = process.argv.slice(2);
for (const pair of pairs) {
  const index = pair.indexOf("=");
  process.env[pair.slice(0, index)] = pair.slice(index + 1);
}

const result = spawnSync("npx", ["vitest", "run", file], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
process.exit(result.status ?? 1);
