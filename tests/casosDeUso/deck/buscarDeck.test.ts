import { BuscarDeck } from "../../../src/casosDeUso/deck/buscarDeck";
import { criarMockDeckGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { ErroPersonalizado } from "../../../src/helpers/error/ErroPersonalizado";

describe("BuscarDeck", () => {
    it("deve retornar o deck com dados do usuário", async () => {
        const deck = new Deck({ id: "d1", nome: "Burn", formato: "legacy", maindeck: [], sideboard: [], usuarioId: "u1" });
        const usuario = new Usuario({ id: "u1", nome: "João", email: "j@e.com", senha: "s" });

        const deckGateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deck),
        });
        const usuarioGateway = criarMockUsuarioGateway({
            buscarVarios: jest.fn().mockResolvedValue([usuario]),
        });
        const uc = BuscarDeck.criar(deckGateway, usuarioGateway);

        const resultado = await uc.executar({ id: "d1" });

        expect(resultado.id).toBe("d1");
        expect(resultado.nome).toBe("Burn");
        expect(resultado.formato).toBe("legacy");
        expect(resultado.usuario).toEqual({ id: "u1", nome: "João" });
    });

    it("deve lançar 404 quando deck não existe", async () => {
        const uc = BuscarDeck.criar(criarMockDeckGateway(), criarMockUsuarioGateway());

        await expect(uc.executar({ id: "inexistente" })).rejects.toThrow(ErroPersonalizado);

        try {
            await uc.executar({ id: "inexistente" });
        } catch (error) {
            expect(error).toBeInstanceOf(ErroPersonalizado);
            expect((error as ErroPersonalizado).status).toBe(404);
        }
    });

    it("deve usar o usuarioId como fallback de nome quando usuário não é encontrado", async () => {
        const deck = new Deck({ id: "d1", nome: "Burn", formato: "legacy", maindeck: [], sideboard: [], usuarioId: "u-desconhecido" });

        const deckGateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deck),
        });
        const uc = BuscarDeck.criar(deckGateway, criarMockUsuarioGateway());

        const resultado = await uc.executar({ id: "d1" });

        expect(resultado.usuario).toEqual({ id: "u-desconhecido", nome: "u-desconhecido" });
    });
});
