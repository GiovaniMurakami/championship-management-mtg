import { CadastrarDeck } from "../../../src/casosDeUso/deck/cadastrarDeck";
import { criarMockDeckGateway } from "../../mocks/gateways";
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
        const uc = CadastrarDeck.criar(gateway);

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
        expect(resultado.linkLigaMagic).toBeNull();
        expect(resultado.maindeck[0].nome).toBe("lightning bolt");
        expect(resultado.commander).toEqual([]);
        expect(resultado.usuario).toEqual({ id: "user-1", nome: "Jogador Teste" });
        expect(resultado.nomeConsolidado).toBe("Burn");
        expect(gateway.salvar).toHaveBeenCalledTimes(1);
    });

    it("deve exigir commander explicito para o formato commander", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

        await expect(
            uc.executar({
                nome: "Atraxa",
                formato: "commander",
                maindeck: [{ nome: "Sol Ring", quantidade: 99 }],
                sideboard: [],
                usuarioId: "user-1",
                usuarioNome: "Jogador Teste",
            })
        ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("commander") });
    });

    it("deve aceitar deck commander com commander separado do sideboard", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

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

    it("deve cadastrar deck commander500 com linkLigaMagic", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

        const resultado = await uc.executar({
            nome: "Meu Deck C500",
            formato: "commander500",
            linkLigaMagic: " https://www.ligamagic.com.br/?view=dks/deck&id=123456 ",
            maindeck: [{ nome: "Sol Ring", quantidade: 99 }],
            sideboard: [],
            commander: commanderValido,
            usuarioId: "user-1",
            usuarioNome: "Jogador Teste",
        });

        expect(resultado.formato).toBe("commander500");
        expect(resultado.linkLigaMagic).toBe("https://www.ligamagic.com.br/?view=dks/deck&id=123456");
    });

    it("deve exigir linkLigaMagic para commander500", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

        await expect(
            uc.executar({
                nome: "Meu Deck C500",
                formato: "commander500",
                maindeck: [{ nome: "Sol Ring", quantidade: 99 }],
                sideboard: [],
                commander: commanderValido,
                usuarioId: "user-1",
                usuarioNome: "Jogador Teste",
            })
        ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("linkLigaMagic") });
    });

    it("deve lancar erro se o maindeck tiver menos de 60 cartas em formatos sem commander", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

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

    it("deve lancar erro se o sideboard tiver mais de 15 cartas quando houver limite", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

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

    it("deve lancar erro se commander tradicional tiver mais de uma entrada", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

        await expect(
            uc.executar({
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
            })
        ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("1") });
    });

    it("deve validar URL de linkLigaMagic em commander500", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

        await expect(
            uc.executar({
                nome: "Meu Deck C500",
                formato: "commander500",
                linkLigaMagic: "nao-e-url",
                maindeck: [{ nome: "Sol Ring", quantidade: 99 }],
                sideboard: [],
                commander: commanderValido,
                usuarioId: "user-1",
                usuarioNome: "Jogador Teste",
            })
        ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("URL") });
    });

    it("deve normalizar nomes de cartas para minusculas", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

        const resultado = await uc.executar({
            nome: "Test",
            formato: "modern",
            maindeck: [{ nome: "  Lightning BOLT  ", quantidade: 60 }],
            sideboard: [{ nome: "  SIDEBOARD Card ", quantidade: 1 }],
            commander: [{ nome: "  COMMANDER Card ", quantidade: 1 }],
            usuarioId: "u",
            usuarioNome: "Usuario",
        });

        expect(resultado.maindeck[0].nome).toBe("lightning bolt");
        expect(resultado.sideboard[0].nome).toBe("sideboard card");
        expect(resultado.commander[0].nome).toBe("commander card");
    });

    it("deve usar o nome do usuario como nomeConsolidado", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

        const resultado = await uc.executar({
            nome: "  Meu Pauper  ",
            formato: "pauper",
            maindeck: maindeckValido,
            sideboard: [],
            usuarioId: "u",
            usuarioNome: "Usuario",
        });

        expect(resultado.nome).toBe("Meu Pauper");
        expect(resultado.nomeConsolidado).toBe("Meu Pauper");
    });

    it("deve lancar 400 quando usuario ja atingiu o limite de 50 decks", async () => {
        const gateway = criarMockDeckGateway({
            listarTotal: jest.fn().mockResolvedValue(50),
        });
        const uc = CadastrarDeck.criar(gateway);

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

    it("deve permitir cadastro quando usuario tem exatamente 49 decks", async () => {
        const gateway = criarMockDeckGateway({
            listarTotal: jest.fn().mockResolvedValue(49),
        });
        const uc = CadastrarDeck.criar(gateway);

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
