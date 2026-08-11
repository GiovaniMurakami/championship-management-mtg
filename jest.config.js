/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    modulePaths: ["<rootDir>"],
    moduleFileExtensions: ["ts", "js", "json"],
    testMatch: ["**/*.test.ts"],
    clearMocks: true,
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            { tsconfig: "tsconfig.test.json", diagnostics: false },
        ],
    },
    collectCoverageFrom: [
        "src/casosDeUso/**/*.ts",
        "src/dominio/entidade/**/*.ts",
        "src/helpers/**/*.ts",
        "src/middlewares/**/*.ts",
        "!src/helpers/logger.ts",
        "!src/middlewares/express/rateLimiter.ts",
    ],
    coverageThreshold: {
        global: {
            statements: 95,
            branches: 90,
            functions: 95,
            lines: 95,
        },
    },
};
