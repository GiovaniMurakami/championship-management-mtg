import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: [
        "src/casosDeUso/**/*.ts",
        "src/dominio/entidade/**/*.ts",
        "src/helpers/**/*.ts",
        "src/middlewares/**/*.ts",
      ],
      exclude: [
        "src/helpers/logger.ts",
        "src/middlewares/express/rateLimiter.ts",
      ],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
});
