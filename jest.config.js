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
    coverageThreshold: {
        global: {
            statements: 80,
            branches: 80,
            functions: 80,
            lines: 80,
        },
    },
};
