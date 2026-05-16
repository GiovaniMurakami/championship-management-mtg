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

    const commanderValido: Carta[] = [
        { nome: "Atraxa, Praetors' Voice", quantidade: 1 },
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
        expect(resultado.commander).toEqual([]);
        expect(resultado.usuario).toEqual({ id: "user-1", nome: "Jogador Teste" });
        expect(resultado.nomeConsolidado).toBe("Burn");
        expect(gateway.salvar).toHaveBeenCalledTimes(1);
        expect(chatGpt.obterNomeConsolidado).toHaveBeenCalledTimes(1);
    });

    it("deve exigir commander explÃ­cito para o formato commander", async () => {
        const gateway = criarMockDeckGateway();
        const chatGpt = criarMockChatGptGateway();
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        try {
            await uc.executar({
                nome: "Atraxa",
                formato: "commander",
                maindeck: [{ nome: "Sol Ring", quantidade: 99 }],
                sideboard: [],
                usuarioId: "user-1",
                usuarioNome: "Jogador Teste",
            });
            fail("Era esperado erro de validaÃ§Ã£o");
        } catch (error: any) {
            expect(error.status).toBe(400);
            expect(error.message).toContain("commander expl");
        }
    });

    it("deve aceitar deck commander com commander separado do sideboard", async () => {
        const gateway = criarMockDeckGateway();
        const chatGpt = criarMockChatGptGateway();
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        const resultado = await uc.executar({
            nome: "Atraxa Superfriends",
            formato: "commander",
            maindeck: [{ nome: "Sol Ring", quantidade: 99 }],
            sideboard: [{ nome: "Veil of Summer", quantidade: 1 }],
            commander: commanderValido,
            usuarioId: "user-1",
            usuarioNome: "Jogador Teste",
        });

        expect(resultado.commander).toEqual([{ nome: "atraxa, praetors' voice", quantidade: 1 }]);
        expect(resultado.sideboard).toEqual([{ nome: "veil of summer", quantidade: 1 }]);
    });

    it("deve lanÃ§ar erro se o maindeck tiver menos de 60 cartas em formatos sem commander", async () => {
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

    it("deve lanÃ§ar erro se o sideboard tiver mais de 15 cartas quando houver limite", async () => {
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

    it("deve lanÃ§ar erro se commander tradicional tiver mais de uma entrada", async () => {
        const gateway = criarMockDeckGateway();
        const chatGpt = criarMockChatGptGateway();
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        try {
            await uc.executar({
                nome: "Partners?",
                formato: "commander",
                maindeck: [{ nome: "Island", quantidade: 99 }],
                sideboard: [],
                commander: [
                    { nome: "Commander A", quantidade: 1 },
                    { nome: "Commander B", quantidade: 1 },
                ],
                usuarioId: "user-1",
                usuarioNome: "Jogador Teste",
            });
            fail("Era esperado erro de validaÃ§Ã£o");
        } catch (error: any) {
            expect(error.status).toBe(400);
            expect(error.message).toContain("no m");
            expect(error.message).toContain("1");
        }
    });

    it("deve normalizar nomes de cartas para minÃºsculas", async () => {
        const gateway = criarMockDeckGateway();
        const chatGpt = criarMockChatGptGateway();
        const uc = CadastrarDeck.criar(gateway, chatGpt);

        const resultado = await uc.executar({
            nome: "Test",
            formato: "modern",
            maindeck: [{ nome: "  Lightning BOLT  ", quantidade: 60 }],
            sideboard: [{ nome: "  SIDEBOARD Card ", quantidade: 1 }],
            commander: [{ nome: "  COMMANDER Card ", quantidade: 1 }],
            usuarioId: "u",
            usuarioNome: "UsuÃ¡rio",
        });

        expect(resultado.maindeck[0].nome).toBe("lightning bolt");
        expect(resultado.sideboard[0].nome).toBe("sideboard card");
        expect(resultado.commander[0].nome).toBe("commander card");
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
            commander: [],
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
            [],
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
            usuarioNome: "UsuÃ¡rio",
        });

        expect(resultado.nomeConsolidado).toBeNull();
    });

    it("deve lanÃ§ar 400 quando usuÃ¡rio jÃ¡ atingiu o limite de 50 decks", async () => {
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

    it("deve permitir cadastro quando usuÃ¡rio tem exatamente 49 decks", async () => {
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
