import { z } from "zod";
import { validarBody } from "../../../src/helpers/validacao/validarBody";

function makeMockResponse() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    } as any;
}

const schema = z.object({
    nome: z.string().min(1, "Nome é obrigatório."),
    idade: z.number().int().min(0),
});

describe("validarBody", () => {
    it("deve retornar os dados parseados quando válidos", () => {
        const res = makeMockResponse();
        const resultado = validarBody(schema, { nome: "Alice", idade: 25 }, res);

        expect(resultado).toEqual({ nome: "Alice", idade: 25 });
        expect(res.status).not.toHaveBeenCalled();
    });

    it("deve retornar null e responder 400 quando inválido", () => {
        const res = makeMockResponse();
        const resultado = validarBody(schema, { nome: "", idade: 25 }, res);

        expect(resultado).toBeNull();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ mensagem: expect.any(String), erros: expect.any(Array) })
        );
    });

    it("deve retornar null e responder 400 quando body é null", () => {
        const res = makeMockResponse();
        const resultado = validarBody(schema, null, res);

        expect(resultado).toBeNull();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve retornar null e responder 400 quando body é undefined", () => {
        const res = makeMockResponse();
        const resultado = validarBody(schema, undefined, res);

        expect(resultado).toBeNull();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve incluir todos os erros na resposta", () => {
        const res = makeMockResponse();
        validarBody(schema, { nome: "", idade: -1 }, res);

        const chamada = res.json.mock.calls[0][0];
        expect(chamada.erros.length).toBeGreaterThanOrEqual(1);
    });
});
