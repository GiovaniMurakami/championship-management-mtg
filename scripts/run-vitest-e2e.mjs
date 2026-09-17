import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config();

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
