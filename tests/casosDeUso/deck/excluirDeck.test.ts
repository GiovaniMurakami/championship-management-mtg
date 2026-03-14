import { ExcluirDeck } from "../../../src/casosDeUso/deck/excluirDeck";
import { criarMockDeckGateway } from "../../mocks/gateways";
import { Deck } from "../../../src/dominio/entidade/deck";

describe("ExcluirDeck", () => {
    const deckExistente = new Deck({
        id: "deck-1",
        nome: "Burn",
        formato: "legacy",
        maindeck: [],
        sideboard: [],
        usuarioId: "user-1",
    });

    it("deve excluir o deck com sucesso", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deckExistente),
        });
        const uc = ExcluirDeck.criar(gateway);

        const resultado = await uc.executar({ id: "deck-1", usuarioIdRequisitante: "user-1" });

        expect(resultado.mensagem).toBe("Deck excluído com sucesso.");
        expect(gateway.excluir).toHaveBeenCalledWith("deck-1");
    });

    it("deve lançar erro se o deck não for encontrado", async () => {
        const gateway = criarMockDeckGateway();
        const uc = ExcluirDeck.criar(gateway);

        await expect(
            uc.executar({ id: "inexistente", usuarioIdRequisitante: "u" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se o usuário não for dono do deck", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deckExistente),
        });
        const uc = ExcluirDeck.criar(gateway);

        await expect(
            uc.executar({ id: "deck-1", usuarioIdRequisitante: "outro-user" })
        ).rejects.toMatchObject({ status: 403 });
    });
});
