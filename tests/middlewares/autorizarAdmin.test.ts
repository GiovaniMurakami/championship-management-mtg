import { Request, Response, NextFunction } from "express";
import { autorizarAdmin } from "../../src/middlewares/express/autorizarAdmin";

describe("autorizarAdmin middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
    });

    it("deve chamar next quando role é 'admin'", () => {
        req = { usuario: { id: "u-1", email: "admin@e.com", nome: "Admin", role: "admin" } };

        autorizarAdmin(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it("deve retornar 403 quando role é 'user'", () => {
        req = { usuario: { id: "u-1", email: "user@e.com", nome: "João", role: "user" } };

        autorizarAdmin(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ mensagem: "Acesso restrito a administradores." });
        expect(next).not.toHaveBeenCalled();
    });

    it("deve retornar 403 quando req.usuario não está definido", () => {
        req = {};

        autorizarAdmin(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ mensagem: "Acesso restrito a administradores." });
        expect(next).not.toHaveBeenCalled();
    });
});
