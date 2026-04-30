import { signToken, verifyToken, preloadJwtKeys, JwtPayload } from "../../src/helpers/jwt";
import crypto from "crypto";

const payload: JwtPayload = { id: "u-1", email: "a@a.com", nome: "Teste", role: "user" };

describe("jwt helpers", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.JWT_PRIVATE_KEY_BASE64;
        delete process.env.JWT_PUBLIC_KEY_BASE64;
        delete process.env.JWT_SECRET;
    });

    afterAll(() => {
        Object.assign(process.env, originalEnv);
    });

    it("signToken retorna null quando não há configuração de chave", () => {
        expect(signToken(payload, "1h")).toBeNull();
    });

    it("verifyToken retorna null quando não há configuração de chave", () => {
        expect(verifyToken("qualquer.token.aqui")).toBeNull();
    });

    it("verifyToken retorna null para token inválido com JWT_SECRET", () => {
        process.env.JWT_SECRET = "segredo-teste";
        expect(verifyToken("token.invalido.aqui")).toBeNull();
    });

    it("signToken e verifyToken funcionam com JWT_SECRET (HS256)", () => {
        process.env.JWT_SECRET = "segredo-teste";
        const token = signToken(payload, "1h");
        expect(token).not.toBeNull();
        const decoded = verifyToken(token!);
        expect(decoded).toMatchObject({ id: "u-1", email: "a@a.com", role: "user" });
    });

    it("signToken e verifyToken funcionam com chaves RSA Base64 (RS256)", () => {
        const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });

        process.env.JWT_PRIVATE_KEY_BASE64 = Buffer.from(privateKey).toString("base64");
        process.env.JWT_PUBLIC_KEY_BASE64 = Buffer.from(publicKey).toString("base64");

        const token = signToken(payload, "1h");
        expect(token).not.toBeNull();
        const decoded = verifyToken(token!);
        expect(decoded).toMatchObject({ id: "u-1", email: "a@a.com", role: "user" });
    });

    describe("preloadJwtKeys", () => {
        it("carrega chaves RSA a partir de variáveis Base64", async () => {
            const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
                modulusLength: 2048,
                publicKeyEncoding: { type: "spki", format: "pem" },
                privateKeyEncoding: { type: "pkcs8", format: "pem" },
            });

            process.env.JWT_PRIVATE_KEY_BASE64 = Buffer.from(privateKey).toString("base64");
            process.env.JWT_PUBLIC_KEY_BASE64 = Buffer.from(publicKey).toString("base64");

            await preloadJwtKeys();

            const token = signToken(payload, "1h");
            expect(token).not.toBeNull();
            const decoded = verifyToken(token!);
            expect(decoded).toMatchObject({ id: "u-1" });
        });

        it("retorna sem erro quando nenhuma variável de chave está definida", async () => {
            await expect(preloadJwtKeys()).resolves.toBeUndefined();
        });

        it("preloadJwtKeys com vars ausentes não falha", async () => {
            await expect(preloadJwtKeys()).resolves.toBeUndefined();
        });
    });
    describe("preloadJwtKeys com SSM", () => {
        afterEach(() => {
            jest.dontMock("@aws-sdk/client-ssm");
            jest.resetModules();
            delete process.env.JWT_SSM_PRIVATE_KEY_PARAM;
            delete process.env.JWT_SSM_PUBLIC_KEY_PARAM;
            delete process.env.JWT_SECRET;
            process.env.NODE_ENV = originalEnv.NODE_ENV;
        });

        it("carrega chaves RSA a partir do SSM", async () => {
            const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
                modulusLength: 2048,
                publicKeyEncoding: { type: "spki", format: "pem" },
                privateKeyEncoding: { type: "pkcs8", format: "pem" },
            });
            jest.resetModules();
            jest.doMock("@aws-sdk/client-ssm", () => ({
                SSMClient: jest.fn().mockImplementation(() => ({
                    send: jest.fn((cmd) => Promise.resolve({
                        Parameter: {
                            Value: cmd.input.Name.includes("private") ? privateKey : publicKey,
                        },
                    })),
                })),
                GetParameterCommand: jest.fn().mockImplementation((input) => ({ input })),
            }));
            process.env.JWT_SSM_PRIVATE_KEY_PARAM = "/jwt/private";
            process.env.JWT_SSM_PUBLIC_KEY_PARAM = "/jwt/public";
            const jwtHelpers = require("../../src/helpers/jwt") as typeof import("../../src/helpers/jwt");

            await jwtHelpers.preloadJwtKeys();
            const token = jwtHelpers.signToken(payload, "1h");

            expect(token).not.toBeNull();
            expect(jwtHelpers.verifyToken(token!)).toMatchObject({ id: "u-1" });
        });

        it("retorna null em producao quando SSM falha e nao ha chaves carregadas", async () => {
            jest.resetModules();
            jest.doMock("@aws-sdk/client-ssm", () => ({
                SSMClient: jest.fn().mockImplementation(() => ({
                    send: jest.fn().mockRejectedValue(new Error("ssm indisponivel")),
                })),
                GetParameterCommand: jest.fn().mockImplementation((input) => ({ input })),
            }));
            process.env.NODE_ENV = "production";
            process.env.JWT_SECRET = "segredo-prod-nao-deve-ser-usado";
            process.env.JWT_SSM_PRIVATE_KEY_PARAM = "/jwt/private";
            process.env.JWT_SSM_PUBLIC_KEY_PARAM = "/jwt/public";
            const jwtHelpers = require("../../src/helpers/jwt") as typeof import("../../src/helpers/jwt");

            await jwtHelpers.preloadJwtKeys();

            expect(jwtHelpers.signToken(payload, "1h")).toBeNull();
            expect(jwtHelpers.verifyToken("token.invalido")).toBeNull();
        });
    });
});
