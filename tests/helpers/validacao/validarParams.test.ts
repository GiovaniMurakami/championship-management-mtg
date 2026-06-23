import { validarParams, validarParamsMiddleware } from "../../../src/helpers/validacao/validarParams";
import { idParamSchema } from "../../../src/helpers/validacao/schemas";

function makeMockResponse() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    } as any;
}

describe("validarParams", () => {
    it("deve retornar params parseados quando válidos", () => {
        const res = makeMockResponse();
        const id = "550e8400-e29b-41d4-a716-446655440000";
        const resultado = validarParams(idParamSchema, { id }, res);

        expect(resultado).toEqual({ id });
        expect(res.status).not.toHaveBeenCalled();
    });

    it("deve retornar null e responder 400 quando inválido", () => {
        const res = makeMockResponse();
        const resultado = validarParams(idParamSchema, { id: "nao-uuid" }, res);

        expect(resultado).toBeNull();
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("validarParamsMiddleware", () => {
    it("deve popular paramsValidados e chamar next", () => {
        const id = "550e8400-e29b-41d4-a716-446655440000";
        const req = { params: { id } } as any;
        const res = makeMockResponse();
        const next = jest.fn();

        validarParamsMiddleware(idParamSchema)(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.paramsValidados).toEqual({ id });
    });
});
