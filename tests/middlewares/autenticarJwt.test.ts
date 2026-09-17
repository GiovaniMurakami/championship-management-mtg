import { Request, Response, NextFunction } from "express";
import { autenticarJwt, inicializarAutenticarJwt } from "../../src/middlewares/express/autenticarJwt";
import { resetJwtKeyCache } from "../../src/helpers/jwt";

const { verify } = vi.hoisted(() => ({ verify: vi.fn() }));

vi.mock("jsonwebtoken", () => ({
    default: { verify, sign: vi.fn() },
    verify,
    sign: vi.fn(),
}));
vi.mock("../../src/infra/dynamodb/repositorios/tokenBlacklistDynamoRepositorio", () => ({
    TokenBlacklistDynamoRepositorio: {
        criar: vi.fn().mockReturnValue({
            existe: vi.fn().mockResolvedValue(false),
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
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        next = vi.fn();
        process.env.JWT_SECRET = "test-secret";
        inicializarAutenticarJwt({ existe: vi.fn().mockResolvedValue(false), adicionar: vi.fn() });
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    it("deve chamar next com payload no req.usuario quando token válido", async () => {
        const payload = { id: "u-1", email: "j@e.com", nome: "João", role: "user" };
        verify.mockReturnValue(payload);
        req.headers = { authorization: "Bearer valid-token" };

        await autenticarJwt(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect((req as any).usuario).toEqual(payload);
    });

    it("deve definir role como 'user' quando não presente no payload", async () => {
        const payload = { id: "u-1", email: "j@e.com", nome: "João" };
        verify.mockReturnValue(payload);
        req.headers = { authorization: "Bearer valid-token" };

        await autenticarJwt(req as Request, res as Response, next);

        expect((req as any).usuario.role).toBe("user");
    });

    it("deve propagar role 'admin' do payload", async () => {
        const payload = { id: "u-1", email: "admin@e.com", nome: "Admin", role: "admin" };
        verify.mockReturnValue(payload);
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
        verify.mockImplementation(() => {
            throw new Error("invalid");
        });
        req.headers = { authorization: "Bearer bad-token" };

        await autenticarJwt(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ mensagem: "Token inválido ou expirado." });
        expect(next).not.toHaveBeenCalled();
    });

    it("deve retornar 401 quando token está na blacklist", async () => {
        const payload = { id: "u-1", email: "j@e.com", nome: "João", role: "user" };
        verify.mockReturnValue(payload);
        req.headers = { authorization: "Bearer revoked-token" };
        inicializarAutenticarJwt({ existe: vi.fn().mockResolvedValue(true), adicionar: vi.fn() });

        await autenticarJwt(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
