/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { build } = require("esbuild");
const path = require("path");

async function buildLambda() {
  try {
    await build({
      absWorkingDir: __dirname,
      entryPoints: {
        handler: path.join(__dirname, "src", "handler.ts"),
        newsletter: path.join(__dirname, "src", "handlerNewsletter.ts"),
      },
      outdir: "build",
      bundle: true,
      minify: false,
      platform: "node",
      sourcemap: true,
      target: "node22",
      external: ["aws-sdk", "ably"],
      loader: { ".ts": "ts" },
      define: {
        "process.env.NODE_ENV": '"production"',
      },
    });

    console.log("🚀 Build concluído com sucesso!");
  } catch (error) {
    console.error("❌ Erro no build:", error);
    process.exit(1);
  }
}

buildLambda();
