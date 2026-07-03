import { BuscarDeck } from "../../../src/casosDeUso/deck/buscarDeck";
import { criarMockDeckGateway, criarMockTorneioGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { ErroPersonalizado } from "../../../src/helpers/error/ErroPersonalizado";

describe("BuscarDeck", () => {
    const criarCaso = (
        deckGateway = criarMockDeckGateway(),
        usuarioGateway = criarMockUsuarioGateway(),
        torneioGateway = criarMockTorneioGateway(),
    ) => BuscarDeck.criar(deckGateway, usuarioGateway, torneioGateway);

    it("deve retornar o deck com dados do usuario", async () => {
        const deck = new Deck({
            id: "d1",
            nome: "Burn",
            formato: "legacy",
            linkLigaMagic: "https://www.ligamagic.com.br/?view=dks/deck&id=123456",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
        });
        const usuario = new Usuario({ id: "u1", nome: "Joao", email: "j@e.com", senha: "s" });

        const deckGateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deck),
        });
        const usuarioGateway = criarMockUsuarioGateway({
            buscarVarios: jest.fn().mockResolvedValue([usuario]),
        });
        const uc = criarCaso(deckGateway, usuarioGateway);

        const resultado = await uc.executar({ id: "d1" });

        expect(resultado.id).toBe("d1");
        expect(resultado.nome).toBe("Burn");
        expect(resultado.formato).toBe("legacy");
        expect(resultado.linkLigaMagic).toBe("https://www.ligamagic.com.br/?view=dks/deck&id=123456");
        expect(resultado.usuario).toEqual({ id: "u1", nome: "Joao" });
    });

    it("deve lancar 404 quando deck nao existe", async () => {
        const uc = criarCaso();

        await expect(uc.executar({ id: "inexistente" })).rejects.toThrow();

        try {
            await uc.executar({ id: "inexistente" });
        } catch (error) {
            expect(error).toBeInstanceOf(ErroPersonalizado);
            expect((error as ErroPersonalizado).status).toBe(404);
        }
    });

    it("deve usar o usuarioId como fallback de nome quando usuario nao e encontrado", async () => {
        const deck = new Deck({ id: "d1", nome: "Burn", formato: "legacy", maindeck: [], sideboard: [], usuarioId: "u-desconhecido" });

        const deckGateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deck),
        });
        const uc = criarCaso(deckGateway);

        const resultado = await uc.executar({ id: "d1" });

        expect(resultado.usuario).toEqual({ id: "u-desconhecido", nome: "u-desconhecido" });
    });

    it("deve retornar 404 para deck oculto quando usuario nao e o dono", async () => {
        const deck = new Deck({
            id: "d1",
            nome: "Burn",
            formato: "legacy",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
            oculto: true,
        });

        const deckGateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deck),
        });
        const uc = criarCaso(deckGateway);

        await expect(uc.executar({ id: "d1" })).rejects.toBeInstanceOf(ErroPersonalizado);
        await expect(uc.executar({ id: "d1", usuarioId: "u2" })).rejects.toMatchObject({ status: 404 });
    });

    it("deve permitir dono visualizar deck oculto", async () => {
        const deck = new Deck({
            id: "d1",
            nome: "Burn",
            formato: "legacy",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
            oculto: true,
        });
        const usuario = new Usuario({ id: "u1", nome: "Joao", email: "j@e.com", senha: "s" });

        const deckGateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deck),
        });
        const usuarioGateway = criarMockUsuarioGateway({
            buscarVarios: jest.fn().mockResolvedValue([usuario]),
        });
        const uc = criarCaso(deckGateway, usuarioGateway);

        const resultado = await uc.executar({ id: "d1", usuarioId: "u1" });

        expect(resultado.id).toBe("d1");
    });

    it("deve permitir visualizar deck oculto de torneio finalizado para outros usuarios", async () => {
        const deck = new Deck({
            id: "d1",
            nome: "Burn",
            formato: "legacy",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
            oculto: true,
            torneioId: "t1",
        });
        const usuario = new Usuario({ id: "u1", nome: "Joao", email: "j@e.com", senha: "s" });
        const torneio = new Torneio({
            id: "t1",
            nome: "FNM",
            horario: new Date(),
            formato: "legacy",
            donoId: "admin",
            status: "finalizado",
            rodadaAtual: 3,
            totalRodadas: 3,
        });

        const deckGateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deck),
        });
        const usuarioGateway = criarMockUsuarioGateway({
            buscarVarios: jest.fn().mockResolvedValue([usuario]),
        });
        const torneioGateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneio),
        });
        const uc = criarCaso(deckGateway, usuarioGateway, torneioGateway);

        const resultado = await uc.executar({ id: "d1", usuarioId: "u2" });

        expect(resultado.id).toBe("d1");
    });

    it("deve manter deck oculto de torneio em andamento inacessivel para outros usuarios", async () => {
        const deck = new Deck({
            id: "d1",
            nome: "Burn",
            formato: "legacy",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
            oculto: true,
            torneioId: "t1",
        });
        const torneio = new Torneio({
            id: "t1",
            nome: "FNM",
            horario: new Date(),
            formato: "legacy",
            donoId: "admin",
            status: "em_andamento",
            rodadaAtual: 1,
            totalRodadas: 3,
        });

        const deckGateway = criarMockDeckGateway({
            buscarPorId: jest.fn().mockResolvedValue(deck),
        });
        const torneioGateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneio),
        });
        const uc = criarCaso(deckGateway, criarMockUsuarioGateway(), torneioGateway);

        await expect(uc.executar({ id: "d1", usuarioId: "u2" })).rejects.toMatchObject({ status: 404 });
    });
});
