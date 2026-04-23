import { StatusErro } from "../../src/helpers/error/statusErro";

describe("StatusErro", () => {
    it("deve ter os valores HTTP corretos", () => {
        expect(StatusErro.erroParametro).toBe(400);
        expect(StatusErro.erroNaoAutorizado).toBe(401);
        expect(StatusErro.erroProibido).toBe(403);
        expect(StatusErro.erroNaoEncontrado).toBe(404);
        expect(StatusErro.erroMuitasRequisicoes).toBe(429);
        expect(StatusErro.erroServidor).toBe(500);
    });
});
