import { AtualizarDeck } from "../../../src/casosDeUso/deck/atualizarDeck";
import { criarMockDeckGateway } from "../../mocks/gateways";
import { Deck, Carta } from "../../../src/dominio/entidade/deck";

describe("AtualizarDeck", () => {
    const maindeckValido: Carta[] = [
        { nome: "lightning bolt", quantidade: 4 },
        { nome: "mountain", quantidade: 56 },
    ];

    const deckExistente = new Deck({
        id: "deck-1",
        nome: "Burn",
        formato: "legacy",
        maindeck: maindeckValido,
        sideboard: [{ nome: "red elemental blast", quantidade: 3 }],
        usuarioId: "user-1",
    });

    it("deve atualizar o nome do deck", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...deckExistente, maindeck: [...deckExistente.maindeck], sideboard: [...deckExistente.sideboard] }),
        });
        const uc = AtualizarDeck.criar(gateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            nome: "Burn Atualizado",
        });

        expect(resultado.nome).toBe("Burn Atualizado");
        expect(gateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se o deck não for encontrado", async () => {
        const gateway = criarMockDeckGateway();
        const uc = AtualizarDeck.criar(gateway);

        await expect(
            uc.executar({ id: "inexistente", usuarioIdRequisitante: "u" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se o usuário não for dono do deck", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...deckExistente }),
        });
        const uc = AtualizarDeck.criar(gateway);

        await expect(
            uc.executar({ id: "deck-1", usuarioIdRequisitante: "outro-user" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("deve lançar erro se o maindeck atualizado tiver menos de 60 cartas", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...deckExistente, maindeck: [...deckExistente.maindeck], sideboard: [...deckExistente.sideboard] }),
        });
        const uc = AtualizarDeck.criar(gateway);

        await expect(
            uc.executar({
                id: "deck-1",
                usuarioIdRequisitante: "user-1",
                maindeck: [{ nome: "carta", quantidade: 10 }],
            })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se o sideboard atualizado tiver mais de 15 cartas", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...deckExistente, maindeck: [...deckExistente.maindeck], sideboard: [...deckExistente.sideboard] }),
        });
        const uc = AtualizarDeck.criar(gateway);

        await expect(
            uc.executar({
                id: "deck-1",
                usuarioIdRequisitante: "user-1",
                sideboard: [{ nome: "carta", quantidade: 16 }],
            })
        ).rejects.toMatchObject({ status: 400 });
    });
});
