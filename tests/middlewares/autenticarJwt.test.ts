import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { autenticarJwt } from "../../src/middlewares/express/autenticarJwt";
import { resetJwtKeyCache } from "../../src/helpers/jwt";

jest.mock("jsonwebtoken");
jest.mock("../../src/infra/mongodb/repositorios/tokenBlacklistRepositorio", () => ({
    TokenBlacklistRepositorio: {
        criar: jest.fn().mockReturnValue({
            existe: jest.fn().mockResolvedValue(false),
        }),
    },
}));

describe("autenticarJwt middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        resetJwtKeyCache();
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        process.env.JWT_SECRET = "test-secret";
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    it("deve chamar next com payload no req.usuario quando token válido", async () => {
        const payload = { id: "u-1", email: "j@e.com", nome: "João", role: "user" };
        (jwt.verify as jest.Mock).mockReturnValue(payload);
        req.headers = { authorization: "Bearer valid-token" };

        await autenticarJwt(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect((req as any).usuario).toEqual(payload);
    });

    it("deve definir role como 'user' quando não presente no payload", async () => {
        const payload = { id: "u-1", email: "j@e.com", nome: "João" };
        (jwt.verify as jest.Mock).mockReturnValue(payload);
        req.headers = { authorization: "Bearer valid-token" };

        await autenticarJwt(req as Request, res as Response, next);

        expect((req as any).usuario.role).toBe("user");
    });

    it("deve propagar role 'admin' do payload", async () => {
        const payload = { id: "u-1", email: "admin@e.com", nome: "Admin", role: "admin" };
        (jwt.verify as jest.Mock).mockReturnValue(payload);
        req.headers = { authorization: "Bearer admin-token" };

        await autenticarJwt(req as Request, res as Response, next);

        expect((req as any).usuario.role).toBe("admin");
    });

    it("deve retornar 401 quando token não informado", async () => {
        req.headers = {};

        await autenticarJwt(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ mensagem: "Token não informado." });
        expect(next).not.toHaveBeenCalled();
    });

    it("deve retornar 401 quando JWT_SECRET não configurado", async () => {
        delete process.env.JWT_SECRET;
        req.headers = { authorization: "Bearer token" };

        await autenticarJwt(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it("deve retornar 401 quando token inválido", async () => {
        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error("invalid");
        });
        req.headers = { authorization: "Bearer bad-token" };

        await autenticarJwt(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ mensagem: "Token inválido ou expirado." });
        expect(next).not.toHaveBeenCalled();
    });

    it("deve retornar 401 quando token está na blacklist", async () => {
        const { TokenBlacklistRepositorio } = jest.requireMock(
            "../../src/infra/mongodb/repositorios/tokenBlacklistRepositorio"
        );
        TokenBlacklistRepositorio.criar.mockReturnValue({
            existe: jest.fn().mockResolvedValue(true),
        });

        const payload = { id: "u-1", email: "j@e.com", nome: "João", role: "user" };
        (jwt.verify as jest.Mock).mockReturnValue(payload);
        req.headers = { authorization: "Bearer revoked-token" };

        // Re-import to get the mock instance — call directly on new instance
        const blacklistMock = { existe: jest.fn().mockResolvedValue(true) };
        TokenBlacklistRepositorio.criar.mockReturnValue(blacklistMock);

        // The module-level instance is already created; test via a fresh mock approach:
        // Simply verify the middleware returns 401 for blacklisted tokens
        // by re-testing with fresh module mock via jest.isolateModules
        await jest.isolateModulesAsync(async () => {
            jest.mock("../../src/infra/mongodb/repositorios/tokenBlacklistRepositorio", () => ({
                TokenBlacklistRepositorio: {
                    criar: jest.fn().mockReturnValue({ existe: jest.fn().mockResolvedValue(true) }),
                },
            }));
            const { autenticarJwt: autJwt } = await import("../../src/middlewares/express/autenticarJwt");
            const req2: any = { headers: { authorization: "Bearer revoked-token" } };
            const res2: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next2 = jest.fn();
            await autJwt(req2, res2, next2);
            expect(res2.status).toHaveBeenCalledWith(401);
            expect(next2).not.toHaveBeenCalled();
        });
    });
});
