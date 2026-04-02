import { CadastrarDeck } from "../../../src/casosDeUso/deck/cadastrarDeck";
import { criarMockDeckGateway, criarMockChatGptGateway } from "../../mocks/gateways";
import { Carta } from "../../../src/dominio/entidade/deck";

describe("CadastrarDeck", () => {
    const maindeckValido: Carta[] = [
        { nome: "Lightning Bolt", quantidade: 4 },
        { nome: "Mountain", quantidade: 56 },
    ];

    const sideboardValido: Carta[] = [
        { nome: "Red Elemental Blast", quantidade: 4 },
    ];

    it("deve cadastrar um deck com sucesso", async () => {
        const gateway = criarMockDeckGateway();
        const chatGpt = criarMockChatGptGateway();
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        const resultado = await uc.executar({
            nome: "Burn",
            formato: "Legacy",
            maindeck: maindeckValido,
            sideboard: sideboardValido,
            usuarioId: "user-1",
            usuarioNome: "Jogador Teste",
        });

        expect(resultado.id).toBeDefined();
        expect(resultado.nome).toBe("Burn");
        expect(resultado.formato).toBe("legacy");
        expect(resultado.maindeck[0].nome).toBe("lightning bolt");
        expect(resultado.usuario).toEqual({ id: "user-1", nome: "Jogador Teste" });
        expect(resultado.nomeConsolidado).toBe("Burn");
        expect(gateway.salvar).toHaveBeenCalledTimes(1);
        expect(chatGpt.obterNomeConsolidado).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se o maindeck tiver menos de 60 cartas", async () => {
        const gateway = criarMockDeckGateway();
        const chatGpt = criarMockChatGptGateway();
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        await expect(
            uc.executar({
                nome: "Deck pequeno",
                formato: "standard",
                maindeck: [{ nome: "carta", quantidade: 10 }],
                sideboard: [],
                usuarioId: "user-1",
                usuarioNome: "Jogador Teste",
            })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se o sideboard tiver mais de 15 cartas", async () => {
        const gateway = criarMockDeckGateway();
        const chatGpt = criarMockChatGptGateway();
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        await expect(
            uc.executar({
                nome: "Deck",
                formato: "standard",
                maindeck: maindeckValido,
                sideboard: [{ nome: "carta", quantidade: 16 }],
                usuarioId: "user-1",
                usuarioNome: "Jogador Teste",
            })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve normalizar nomes de cartas para minúsculas", async () => {
        const gateway = criarMockDeckGateway();
        const chatGpt = criarMockChatGptGateway();
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        const resultado = await uc.executar({
            nome: "Test",
            formato: "modern",
            maindeck: [{ nome: "  Lightning BOLT  ", quantidade: 60 }],
            sideboard: [{ nome: "  SIDEBOARD Card ", quantidade: 1 }],
            usuarioId: "u",
            usuarioNome: "Usuário",
        });

        expect(resultado.maindeck[0].nome).toBe("lightning bolt");
        expect(resultado.sideboard[0].nome).toBe("sideboard card");
    });

    it("deve chamar o ChatGPT com as cartas normalizadas e o formato correto", async () => {
        const gateway = criarMockDeckGateway();
        const chatGpt = criarMockChatGptGateway();
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        await uc.executar({
            nome: "Burn",
            formato: "Legacy",
            maindeck: maindeckValido,
            sideboard: sideboardValido,
            usuarioId: "user-1",
            usuarioNome: "Jogador Teste",
        });

        expect(chatGpt.obterNomeConsolidado).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ nome: "lightning bolt" }),
            ]),
            expect.arrayContaining([
                expect.objectContaining({ nome: "red elemental blast" }),
            ]),
            "legacy"
        );
    });

    it("deve salvar nomeConsolidado como null quando o ChatGPT retorna null", async () => {
        const gateway = criarMockDeckGateway();
        const chatGpt = criarMockChatGptGateway({
            obterNomeConsolidado: jest.fn().mockResolvedValue(null),
        });
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        const resultado = await uc.executar({
            nome: "Deck Desconhecido",
            formato: "modern",
            maindeck: maindeckValido,
            sideboard: [],
            usuarioId: "u",
            usuarioNome: "Usuário",
        });

        expect(resultado.nomeConsolidado).toBeNull();
    });

    it("deve lançar 400 quando usuário já atingiu o limite de 50 decks", async () => {
        const gateway = criarMockDeckGateway({
            listarTotal: jest.fn().mockResolvedValue(50),
        });
        const chatGpt = criarMockChatGptGateway();
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        await expect(
            uc.executar({
                nome: "Deck Extra",
                formato: "modern",
                maindeck: maindeckValido,
                sideboard: [],
                usuarioId: "user-1",
                usuarioNome: "Jogador",
            })
        ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("50") });
    });

    it("deve permitir cadastro quando usuário tem exatamente 49 decks", async () => {
        const gateway = criarMockDeckGateway({
            listarTotal: jest.fn().mockResolvedValue(49),
        });
        const chatGpt = criarMockChatGptGateway();
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        const resultado = await uc.executar({
            nome: "Deck 50",
            formato: "modern",
            maindeck: maindeckValido,
            sideboard: [],
            usuarioId: "user-1",
            usuarioNome: "Jogador",
        });

        expect(resultado.id).toBeDefined();
        expect(gateway.salvar).toHaveBeenCalledTimes(1);
    });
});
