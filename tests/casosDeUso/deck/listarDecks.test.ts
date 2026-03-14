import { ListarDecks } from "../../../src/casosDeUso/deck/listarDecks";
import { criarMockDeckGateway } from "../../mocks/gateways";
import { Deck } from "../../../src/dominio/entidade/deck";

describe("ListarDecks", () => {
    it("deve retornar lista de decks", async () => {
        const decks = [
            new Deck({ id: "d1", nome: "Burn", formato: "legacy", maindeck: [], sideboard: [], usuarioId: "u1" }),
            new Deck({ id: "d2", nome: "Storm", formato: "modern", maindeck: [], sideboard: [], usuarioId: "u1" }),
        ];
        const gateway = criarMockDeckGateway({
            listar: jest.fn().mockResolvedValue(decks),
        });
        const uc = ListarDecks.criar(gateway);

        const resultado = await uc.executar({ usuarioId: "u1" });

        expect(resultado).toHaveLength(2);
        expect(resultado[0].nome).toBe("Burn");
        expect(resultado[1].nome).toBe("Storm");
    });

    it("deve retornar lista vazia quando não há decks", async () => {
        const gateway = criarMockDeckGateway();
        const uc = ListarDecks.criar(gateway);

        const resultado = await uc.executar({});
        expect(resultado).toEqual([]);
    });

    it("deve converter filtros de data corretamente", async () => {
        const gateway = criarMockDeckGateway();
        const uc = ListarDecks.criar(gateway);

        await uc.executar({
            formato: "legacy",
            criadoApos: "2025-01-01T00:00:00Z",
            criadoAntes: "2025-12-31T23:59:59Z",
        });

        const chamada = (gateway.listar as jest.Mock).mock.calls[0][0];
        expect(chamada.formato).toBe("legacy");
        expect(chamada.criadoApos).toBeInstanceOf(Date);
        expect(chamada.criadoAntes).toBeInstanceOf(Date);
    });
});
