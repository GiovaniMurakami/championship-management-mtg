import { Request, Response, NextFunction } from "express";
import { autenticarJwtOpcional } from "../../../src/middlewares/express/autenticarJwtOpcional";
import { inicializarAutenticarJwt } from "../../../src/middlewares/express/autenticarJwt";
import { signToken } from "../../../src/helpers/jwt";
import { criarMockTokenBlacklistGateway } from "../../mocks/gateways";

function makeReqRes(headers: Record<string, string> = {}) {
    const req = { headers } as Request;
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    return { req, res, next };
}

describe("autenticarJwtOpcional", () => {
    beforeEach(() => {
        process.env.JWT_SECRET = "test-secret";
        process.env.NODE_ENV = "test";
        inicializarAutenticarJwt(criarMockTokenBlacklistGateway());
    });

    it("deve continuar sem usuario quando token nao e informado", async () => {
        const { req, res, next } = makeReqRes();

        await autenticarJwtOpcional(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.usuario).toBeUndefined();
        expect(res.status).not.toHaveBeenCalled();
    });

    it("deve injetar usuario quando token e valido", async () => {
        const token = signToken(
            { id: "u1", email: "a@b.com", nome: "Alice", role: "user" },
            "1h"
        )!;
        const { req, res, next } = makeReqRes({ authorization: `Bearer ${token}` });

        await autenticarJwtOpcional(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.usuario).toEqual({
            id: "u1",
            email: "a@b.com",
            nome: "Alice",
            role: "user",
        });
    });

    it("deve retornar 401 quando token informado e invalido", async () => {
        const { req, res, next } = makeReqRes({ authorization: "Bearer token-invalido" });

        await autenticarJwtOpcional(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
