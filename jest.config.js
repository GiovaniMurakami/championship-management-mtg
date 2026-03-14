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
};
