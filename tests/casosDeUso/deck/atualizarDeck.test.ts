import { AtualizarDeck } from "../../../src/casosDeUso/deck/atualizarDeck";
import { criarMockDeckGateway, criarMockChatGptGateway } from "../../mocks/gateways";
import { Deck, Carta } from "../../../src/dominio/entidade/deck";

describe("AtualizarDeck", () => {
    const maindeckValido: Carta[] = [
        { nome: "lightning bolt", quantidade: 4 },
        { nome: "mountain", quantidade: 56 },
    ];

    const deckExistente = new Deck({
        id: "deck-1",
        nome: "Burn",
        nomeConsolidado: "Mono Red Burn",
        formato: "legacy",
        maindeck: maindeckValido,
        sideboard: [{ nome: "red elemental blast", quantidade: 3 }],
        usuarioId: "user-1",
    });

    it("deve atualizar o nome do deck", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...deckExistente, maindeck: [...deckExistente.maindeck], sideboard: [...deckExistente.sideboard] }),
        });
        const chatGptGateway = criarMockChatGptGateway();
        const uc = AtualizarDeck.criar(gateway, chatGptGateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            nome: "Burn Atualizado",
        });

        expect(resultado.nome).toBe("Burn Atualizado");
        expect(resultado.usuario).toEqual({ id: "user-1", nome: "Jogador Teste" });
        expect(gateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("não deve recalcular nomeConsolidado se maindeck e sideboard não forem alterados", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...deckExistente, maindeck: [...deckExistente.maindeck], sideboard: [...deckExistente.sideboard] }),
        });
        const chatGptGateway = criarMockChatGptGateway();
        const uc = AtualizarDeck.criar(gateway, chatGptGateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            nome: "Burn Atualizado",
        });

        expect(chatGptGateway.obterNomeConsolidado).not.toHaveBeenCalled();
        expect(resultado.nomeConsolidado).toBe("Mono Red Burn");
    });

    it("deve recalcular nomeConsolidado ao atualizar o maindeck", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...deckExistente, maindeck: [...deckExistente.maindeck], sideboard: [...deckExistente.sideboard] }),
        });
        const chatGptGateway = criarMockChatGptGateway({
            obterNomeConsolidado: jest.fn().mockResolvedValue("Stompy"),
        });
        const uc = AtualizarDeck.criar(gateway, chatGptGateway);

        const novoMaindeck: Carta[] = [
            { nome: "llanowar elves", quantidade: 4 },
            { nome: "forest", quantidade: 56 },
        ];

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            maindeck: novoMaindeck,
        });

        expect(chatGptGateway.obterNomeConsolidado).toHaveBeenCalledTimes(1);
        expect(resultado.nomeConsolidado).toBe("Stompy");
    });

    it("deve lançar erro se o deck não for encontrado", async () => {
        const gateway = criarMockDeckGateway();
        const uc = AtualizarDeck.criar(gateway, criarMockChatGptGateway());

        await expect(
            uc.executar({ id: "inexistente", usuarioIdRequisitante: "u", isAdmin: false, usuarioNome: "u" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se o usuário não for dono do deck e não for admin", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...deckExistente }),
        });
        const uc = AtualizarDeck.criar(gateway, criarMockChatGptGateway());

        await expect(
            uc.executar({ id: "deck-1", usuarioIdRequisitante: "outro-user", isAdmin: false, usuarioNome: "Outro" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode atualizar deck de outro usuário", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...deckExistente, maindeck: [...deckExistente.maindeck], sideboard: [...deckExistente.sideboard] }),
        });
        const uc = AtualizarDeck.criar(gateway, criarMockChatGptGateway());

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "admin-id",
            isAdmin: true,
            usuarioNome: "Admin",
            nome: "Burn Editado pelo Admin",
        });

        expect(resultado.nome).toBe("Burn Editado pelo Admin");
        expect(gateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se o maindeck atualizado tiver menos de 60 cartas", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...deckExistente, maindeck: [...deckExistente.maindeck], sideboard: [...deckExistente.sideboard] }),
        });
        const uc = AtualizarDeck.criar(gateway, criarMockChatGptGateway());

        await expect(
            uc.executar({
                id: "deck-1",
                usuarioIdRequisitante: "user-1",
                isAdmin: false,
                usuarioNome: "Jogador Teste",
                maindeck: [{ nome: "carta", quantidade: 10 }],
            })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se o sideboard atualizado tiver mais de 15 cartas", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...deckExistente, maindeck: [...deckExistente.maindeck], sideboard: [...deckExistente.sideboard] }),
        });
        const uc = AtualizarDeck.criar(gateway, criarMockChatGptGateway());

        await expect(
            uc.executar({
                id: "deck-1",
                usuarioIdRequisitante: "user-1",
                isAdmin: false,
                usuarioNome: "Jogador Teste",
                sideboard: [{ nome: "carta", quantidade: 16 }],
            })
        ).rejects.toMatchObject({ status: 400 });
    });
});
