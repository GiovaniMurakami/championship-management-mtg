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
        nomeConsolidado: "Mono Red Burn",
        formato: "legacy",
        maindeck: maindeckValido,
        sideboard: [{ nome: "red elemental blast", quantidade: 3 }],
        commander: [],
        usuarioId: "user-1",
    });

    it("deve atualizar o nome do deck", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({ ...deckExistente })),
        });
        const uc = AtualizarDeck.criar(gateway);

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

    it("deve atualizar o nomeConsolidado diretamente", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({ ...deckExistente })),
        });
        const invalidarParticao = jest.fn().mockResolvedValue(undefined);
        const uc = AtualizarDeck.criar(gateway, { invalidarParticao } as any);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            nomeConsolidado: "4C Omnath",
        });

        expect(resultado.nomeConsolidado).toBe("4C Omnath");
        expect(gateway.atualizar).toHaveBeenCalledTimes(1);
        expect(invalidarParticao).toHaveBeenCalledWith("metagame");
    });

    it("nao invalida metagame quando nomeConsolidado permanece igual", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({ ...deckExistente })),
        });
        const invalidarParticao = jest.fn().mockResolvedValue(undefined);
        const uc = AtualizarDeck.criar(gateway, { invalidarParticao } as any);

        await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            cartaRepresentativa: "Lightning Bolt",
        });

        expect(invalidarParticao).not.toHaveBeenCalled();
    });

    it("deck travado: permite alterar apenas nomeConsolidado", async () => {
        const deckTravado = new Deck({ ...deckExistente, travado: true });
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deckTravado),
        });
        const uc = AtualizarDeck.criar(gateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: true,
            usuarioNome: "Admin",
            nome: "Tentativa de mudar nome",
            nomeConsolidado: "Elfos",
            formato: "pauper",
            maindeck: [{ nome: "forest", quantidade: 60 }],
            sideboard: [],
            commander: [],
        });

        expect(resultado.nomeConsolidado).toBe("Elfos");
        expect(resultado.nome).toBe("Burn");
        expect(resultado.formato).toBe("legacy");
        expect(resultado.maindeck).toEqual(maindeckValido);
        expect(gateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deck travado: permite alterar cartaRepresentativa", async () => {
        const deckTravado = new Deck({ ...deckExistente, travado: true });
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deckTravado),
        });
        const uc = AtualizarDeck.criar(gateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: true,
            usuarioNome: "Admin",
            cartaRepresentativa: "Tolarian Terror",
        });

        expect(resultado.cartaRepresentativa).toBe("Tolarian Terror");
        expect(resultado.nome).toBe("Burn");
        expect(gateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deck travado: bloqueia update sem nomeConsolidado", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({ ...deckExistente, travado: true })),
        });
        const uc = AtualizarDeck.criar(gateway);

        await expect(
            uc.executar({
                id: "deck-1",
                usuarioIdRequisitante: "user-1",
                isAdmin: false,
                usuarioNome: "Jogador Teste",
                nome: "Outro",
            })
        ).rejects.toMatchObject({
            status: 400,
            message: expect.stringContaining("travado"),
        });
    });

    it("deve permitir limpar o nomeConsolidado enviando null", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({ ...deckExistente })),
        });
        const uc = AtualizarDeck.criar(gateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            nomeConsolidado: null,
        });

        expect(resultado.nomeConsolidado).toBeNull();
    });

    it("nao deve alterar nomeConsolidado se nao for enviado", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({ ...deckExistente })),
        });
        const uc = AtualizarDeck.criar(gateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            nome: "Outro Nome",
        });

        expect(resultado.nomeConsolidado).toBe("Mono Red Burn");
    });

    it("ao renomear, atualiza nomeConsolidado quando ele ainda e o nome do usuario", async () => {
        const deck = new Deck({ ...deckExistente, nome: "Burn", nomeConsolidado: "Burn" });
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deck),
        });
        const uc = AtualizarDeck.criar(gateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            nome: "Mono Red",
        });

        expect(resultado.nome).toBe("Mono Red");
        expect(resultado.nomeConsolidado).toBe("Mono Red");
    });

    it("ao renomear, atualiza nomeConsolidado quando ele e nulo", async () => {
        const deck = new Deck({ ...deckExistente, nome: "Burn", nomeConsolidado: null });
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deck),
        });
        const uc = AtualizarDeck.criar(gateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            nome: "Affinity",
        });

        expect(resultado.nome).toBe("Affinity");
        expect(resultado.nomeConsolidado).toBe("Affinity");
    });

    it("deve atualizar commander explicitamente", async () => {
        const deckCommander = new Deck({
            ...deckExistente,
            formato: "commander",
            maindeck: [{ nome: "sol ring", quantidade: 99 }],
            commander: [{ nome: "old commander", quantidade: 1 }],
        });
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deckCommander),
        });
        const uc = AtualizarDeck.criar(gateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            commander: [{ nome: "Atraxa, Praetors' Voice", quantidade: 1 }],
        });

        expect(resultado.commander).toEqual([{ nome: "atraxa, praetors' voice", quantidade: 1 }]);
    });

    it("deve atualizar linkLigaMagic em deck commander500", async () => {
        const deckCommander500 = new Deck({
            ...deckExistente,
            formato: "commander500",
            maindeck: [{ nome: "sol ring", quantidade: 99 }],
            commander: [{ nome: "old commander", quantidade: 1 }],
            linkLigaMagic: "https://www.ligamagic.com.br/?view=dks/deck&id=1",
        });
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deckCommander500),
        });
        const uc = AtualizarDeck.criar(gateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            linkLigaMagic: " https://www.ligamagic.com.br/?view=dks/deck&id=2 ",
        });

        expect(resultado.linkLigaMagic).toBe("https://www.ligamagic.com.br/?view=dks/deck&id=2");
    });

    it("deve tratar deck legado sem commander salvo", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({
                id: "deck-1",
                nome: "Burn",
                nomeConsolidado: "Mono Red Burn",
                formato: "legacy",
                maindeck: maindeckValido,
                sideboard: [{ nome: "red elemental blast", quantidade: 3 }],
                usuarioId: "user-1",
            })),
        });
        const uc = AtualizarDeck.criar(gateway);

        const resultado = await uc.executar({
            id: "deck-1",
            usuarioIdRequisitante: "user-1",
            isAdmin: false,
            usuarioNome: "Jogador Teste",
            nome: "Burn Legado",
        });

        expect(resultado.commander).toEqual([]);
    });

    it("deve lancar erro se o deck nao for encontrado", async () => {
        const gateway = criarMockDeckGateway();
        const uc = AtualizarDeck.criar(gateway);

        await expect(
            uc.executar({ id: "inexistente", usuarioIdRequisitante: "u", isAdmin: false, usuarioNome: "u" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lancar erro se o usuario nao for dono do deck e nao for admin", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({ ...deckExistente })),
        });
        const uc = AtualizarDeck.criar(gateway);

        await expect(
            uc.executar({ id: "deck-1", usuarioIdRequisitante: "outro-user", isAdmin: false, usuarioNome: "Outro" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("admin pode atualizar deck de outro usuario", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({ ...deckExistente })),
        });
        const uc = AtualizarDeck.criar(gateway);

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

    it("deve lancar erro se o maindeck atualizado tiver menos de 60 cartas", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({ ...deckExistente })),
        });
        const uc = AtualizarDeck.criar(gateway);

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

    it("deve lancar erro se o sideboard atualizado tiver mais de 15 cartas", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({ ...deckExistente })),
        });
        const uc = AtualizarDeck.criar(gateway);

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

    it("deve lancar erro ao limpar commander de um deck commander", async () => {
        const deckCommander = new Deck({
            ...deckExistente,
            formato: "commander",
            maindeck: [{ nome: "sol ring", quantidade: 99 }],
            commander: [{ nome: "atraxa", quantidade: 1 }],
        });
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deckCommander),
        });
        const uc = AtualizarDeck.criar(gateway);

        await expect(
            uc.executar({
                id: "deck-1",
                usuarioIdRequisitante: "user-1",
                isAdmin: false,
                usuarioNome: "Jogador Teste",
                commander: [],
            })
        ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("commander") });
    });

    it("deve exigir linkLigaMagic ao converter deck para commander500", async () => {
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Deck({
                ...deckExistente,
                maindeck: [{ nome: "sol ring", quantidade: 99 }],
                commander: [{ nome: "atraxa", quantidade: 1 }],
            })),
        });
        const uc = AtualizarDeck.criar(gateway);

        await expect(
            uc.executar({
                id: "deck-1",
                usuarioIdRequisitante: "user-1",
                isAdmin: false,
                usuarioNome: "Jogador Teste",
                formato: "commander500",
            })
        ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("linkLigaMagic") });
    });

    it("deve validar URL de linkLigaMagic em deck commander500", async () => {
        const deckCommander500 = new Deck({
            ...deckExistente,
            formato: "commander500",
            maindeck: [{ nome: "sol ring", quantidade: 99 }],
            commander: [{ nome: "old commander", quantidade: 1 }],
            linkLigaMagic: "https://www.ligamagic.com.br/?view=dks/deck&id=1",
        });
        const gateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deckCommander500),
        });
        const uc = AtualizarDeck.criar(gateway);

        await expect(
            uc.executar({
                id: "deck-1",
                usuarioIdRequisitante: "user-1",
                isAdmin: false,
                usuarioNome: "Jogador Teste",
                linkLigaMagic: "invalido",
            })
        ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("URL") });
    });
});
