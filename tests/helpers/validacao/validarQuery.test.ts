import { listarDecksQuerySchema } from "../../../src/helpers/validacao/schemas";
import { validarQuery } from "../../../src/helpers/validacao/validarQuery";

function makeMockResponse() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    } as any;
}

describe("validarQuery", () => {
    it("deve parsear limite e offset como números", () => {
        const res = makeMockResponse();
        const resultado = validarQuery(
            listarDecksQuerySchema,
            { limite: "20", offset: "0" },
            res
        );

        expect(resultado).toEqual({ limite: 20, offset: 0 });
    });

    it("deve rejeitar limite acima do máximo", () => {
        const res = makeMockResponse();
        const resultado = validarQuery(listarDecksQuerySchema, { limite: "500" }, res);

        expect(resultado).toBeNull();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("deve aceitar o filtro por jogador", () => {
        const res = makeMockResponse();
        const resultado = validarQuery(listarDecksQuerySchema, { jogador: "maria" }, res);

        expect(resultado).toEqual({ jogador: "maria" });
    });
});
