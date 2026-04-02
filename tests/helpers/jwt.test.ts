import { signToken, verifyToken, JwtPayload } from "../../src/helpers/jwt";
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
});
