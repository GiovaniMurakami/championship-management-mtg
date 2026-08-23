import { ListarDecks } from "../../../src/casosDeUso/deck/listarDecks";
import { criarMockDeckGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("ListarDecks", () => {
    it("deve filtrar decks pelos usuarios encontrados pelo nome do jogador", async () => {
        const deckGateway = criarMockDeckGateway();
        const usuarioGateway = criarMockUsuarioGateway({
            listar: jest.fn().mockResolvedValue([
                new Usuario({ id: "u2", nome: "Maria", email: "m@e.com", senha: "s", nickMTGO: "maria_mtgo" }),
            ]),
        });
        const uc = ListarDecks.criar(deckGateway, usuarioGateway);

        await uc.executar({ jogador: "maria" });

        expect(usuarioGateway.listar).toHaveBeenCalledWith({ nome: "maria" });
        expect(deckGateway.listar).toHaveBeenCalledWith(expect.objectContaining({ usuarioIds: ["u2"] }));
        expect(deckGateway.listarTotal).toHaveBeenCalledWith(expect.objectContaining({ usuarioIds: ["u2"] }));
    });

    it("deve retornar lista de decks com dados do usuario", async () => {
        const decks = [
            new Deck({ id: "d1", nome: "Burn", formato: "legacy", maindeck: [], sideboard: [], usuarioId: "u1" }),
            new Deck({ id: "d2", nome: "Storm", formato: "modern", maindeck: [], sideboard: [], usuarioId: "u1" }),
        ];
        const usuarios = [
            new Usuario({ id: "u1", nome: "Joao", email: "j@e.com", senha: "s", nickMTGO: "joao_mtgo" }),
        ];
        const deckGateway = criarMockDeckGateway({
            listar: jest.fn().mockResolvedValue(decks),
            listarTotal: jest.fn().mockResolvedValue(2),
        });
        const usuarioGateway = criarMockUsuarioGateway({
            buscarVarios: jest.fn().mockResolvedValue(usuarios),
        });
        const uc = ListarDecks.criar(deckGateway, usuarioGateway);

        const resultado = await uc.executar({ usuarioId: "u1" });

        expect(resultado.decks).toHaveLength(2);
        expect(resultado.total).toBe(2);
        expect(resultado.decks[0].nome).toBe("Burn");
        expect(resultado.decks[0].linkLigaMagic).toBeNull();
        expect(resultado.decks[0].usuario).toEqual({ id: "u1", nome: "joao_mtgo", excluido: false });
        expect(resultado.decks[1].nome).toBe("Storm");
        expect(resultado.decks[1].usuario).toEqual({ id: "u1", nome: "joao_mtgo", excluido: false });
    });

    it("deve retornar lista vazia quando nao ha decks", async () => {
        const uc = ListarDecks.criar(criarMockDeckGateway(), criarMockUsuarioGateway());

        const resultado = await uc.executar({});
        expect(resultado.decks).toEqual([]);
        expect(resultado.total).toBe(0);
    });

    it("deve usar defaults quando limite e offset nao sao passados", async () => {
        const deckGateway = criarMockDeckGateway();
        const uc = ListarDecks.criar(deckGateway, criarMockUsuarioGateway());

        await uc.executar({});

        const chamada = (deckGateway.listar as jest.Mock).mock.calls[0][0];
        expect(chamada.limite).toBeGreaterThan(0);
        expect(chamada.offset).toBe(0);
    });

    it("deve usar id do usuario quando usuario nao esta no mapa", async () => {
        const decks = [
            new Deck({ id: "d1", nome: "Burn", formato: "legacy", maindeck: [], sideboard: [], usuarioId: "u-desconhecido" }),
        ];
        const deckGateway = criarMockDeckGateway({
            listar: jest.fn().mockResolvedValue(decks),
            listarTotal: jest.fn().mockResolvedValue(1),
        });
        const usuarioGateway = criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([]) });
        const uc = ListarDecks.criar(deckGateway, usuarioGateway);

        const resultado = await uc.executar({ usuarioId: "u-desconhecido" });

        expect(resultado.decks[0].usuario.nome).toBe("u-desconhecido");
    });

    it("deve converter filtros de data corretamente", async () => {
        const deckGateway = criarMockDeckGateway();
        const uc = ListarDecks.criar(deckGateway, criarMockUsuarioGateway());

        await uc.executar({
            formato: "legacy",
            criadoApos: "2025-01-01T00:00:00Z",
            criadoAntes: "2025-12-31T23:59:59Z",
        });

        const chamada = (deckGateway.listar as jest.Mock).mock.calls[0][0];
        expect(chamada.formato).toBe("legacy");
        expect(chamada.criadoApos).toBeInstanceOf(Date);
        expect(chamada.criadoAntes).toBeInstanceOf(Date);
    });

    it("deve retornar linkLigaMagic na listagem", async () => {
        const decks = [
            new Deck({
                id: "d1",
                nome: "C500",
                formato: "commander500",
                linkLigaMagic: "https://www.ligamagic.com.br/?view=dks/deck&id=123456",
                maindeck: [],
                sideboard: [],
                commander: [],
                usuarioId: "u1",
            }),
        ];
        const deckGateway = criarMockDeckGateway({
            listar: jest.fn().mockResolvedValue(decks),
            listarTotal: jest.fn().mockResolvedValue(1),
        });
        const usuarioGateway = criarMockUsuarioGateway({
            buscarVarios: jest.fn().mockResolvedValue([
                new Usuario({ id: "u1", nome: "Joao", email: "j@e.com", senha: "s" }),
            ]),
        });
        const uc = ListarDecks.criar(deckGateway, usuarioGateway);

        const resultado = await uc.executar({ usuarioId: "u1", formato: "commander500" });

        expect(resultado.decks[0].linkLigaMagic).toBe("https://www.ligamagic.com.br/?view=dks/deck&id=123456");
    });
});
