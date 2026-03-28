import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { autenticarJwt } from "../../src/middlewares/express/autenticarJwt";

jest.mock("jsonwebtoken");

describe("autenticarJwt middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
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

    it("deve chamar next com payload no req.usuario quando token válido", () => {
        const payload = { id: "u-1", email: "j@e.com", nome: "João", role: "user" };
        (jwt.verify as jest.Mock).mockReturnValue(payload);
        req.headers = { authorization: "Bearer valid-token" };

        autenticarJwt(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect((req as any).usuario).toEqual(payload);
    });

    it("deve definir role como 'user' quando não presente no payload", () => {
        const payload = { id: "u-1", email: "j@e.com", nome: "João" };
        (jwt.verify as jest.Mock).mockReturnValue(payload);
        req.headers = { authorization: "Bearer valid-token" };

        autenticarJwt(req as Request, res as Response, next);

        expect((req as any).usuario.role).toBe("user");
    });

    it("deve propagar role 'admin' do payload", () => {
        const payload = { id: "u-1", email: "admin@e.com", nome: "Admin", role: "admin" };
        (jwt.verify as jest.Mock).mockReturnValue(payload);
        req.headers = { authorization: "Bearer admin-token" };

        autenticarJwt(req as Request, res as Response, next);

        expect((req as any).usuario.role).toBe("admin");
    });

    it("deve retornar 401 quando token não informado", () => {
        req.headers = {};

        autenticarJwt(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ mensagem: "Token não informado." });
        expect(next).not.toHaveBeenCalled();
    });

    it("deve retornar 500 quando JWT_SECRET não configurado", () => {
        delete process.env.JWT_SECRET;
        req.headers = { authorization: "Bearer token" };

        autenticarJwt(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(next).not.toHaveBeenCalled();
    });

    it("deve retornar 401 quando token inválido", () => {
        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error("invalid");
        });
        req.headers = { authorization: "Bearer bad-token" };

        autenticarJwt(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ mensagem: "Token inválido ou expirado." });
        expect(next).not.toHaveBeenCalled();
    });
});
