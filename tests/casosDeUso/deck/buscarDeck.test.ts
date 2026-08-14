import { BuscarDeck } from "../../../src/casosDeUso/deck/buscarDeck";
import {
    criarMockDeckGateway,
    criarMockPartidaGateway,
    criarMockUsuarioGateway,
} from "../../mocks/gateways";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { ErroPersonalizado } from "../../../src/helpers/error/ErroPersonalizado";

function criarUc(deckGatewayOverrides = {}, partidaOverrides = {}) {
    return BuscarDeck.criar(
        criarMockDeckGateway(deckGatewayOverrides),
        criarMockUsuarioGateway({
            buscarVarios: jest.fn().mockResolvedValue([
                new Usuario({ id: "u1", nome: "Joao", email: "j@e.com", senha: "s", nickMTGO: "joao_mtgo" }),
            ]),
        }),
        criarMockPartidaGateway(partidaOverrides)
    );
}

describe("BuscarDeck", () => {
    it("deve retornar o deck com dados do usuario e estatisticas zeradas", async () => {
        const deck = new Deck({
            id: "d1",
            nome: "Burn",
            formato: "legacy",
            linkLigaMagic: "https://www.ligamagic.com.br/?view=dks/deck&id=123456",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
        });

        const uc = criarUc({
            buscarPorId: jest.fn().mockResolvedValue(deck),
            listarPorDeckOriginalId: jest.fn().mockResolvedValue([]),
        });

        const resultado = await uc.executar({ id: "d1" });

        expect(resultado.id).toBe("d1");
        expect(resultado.nome).toBe("Burn");
        expect(resultado.formato).toBe("legacy");
        expect(resultado.linkLigaMagic).toBe("https://www.ligamagic.com.br/?view=dks/deck&id=123456");
        expect(resultado.usuario).toEqual({ id: "u1", nome: "joao_mtgo", excluido: false });
        expect(resultado.estatisticas).toEqual({
            vitorias: 0,
            derrotas: 0,
            empates: 0,
            totalPartidas: 0,
            winrate: 0,
        });
    });

    it("deve agregar win rate a partir de copias travadas", async () => {
        const original = new Deck({
            id: "d-orig",
            nome: "Burn",
            formato: "legacy",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
        });
        const copia = new Deck({
            id: "d-clone",
            nome: "Burn",
            formato: "legacy",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
            travado: true,
            deckOriginalId: "d-orig",
            torneioId: "t-1",
        });

        const partidas = [
            new Partida({
                id: "p1",
                torneioId: "t-1",
                rodada: 1,
                jogador1Id: "u1",
                jogador2Id: "u2",
                deckJogador1Id: "d-clone",
                deckJogador2Id: "outro",
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
            }),
            new Partida({
                id: "p2",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u1",
                jogador2Id: "u3",
                deckJogador1Id: "d-clone",
                deckJogador2Id: "outro2",
                vitoriasJogador1: 0,
                vitoriasJogador2: 2,
                status: "finalizada",
            }),
            new Partida({
                id: "p3",
                torneioId: "t-1",
                rodada: 3,
                jogador1Id: "u1",
                jogador2Id: "u4",
                deckJogador1Id: "d-clone",
                deckJogador2Id: "outro3",
                vitoriasJogador1: 1,
                vitoriasJogador2: 1,
                status: "finalizada",
            }),
            // BYE deve ser ignorado
            new Partida({
                id: "p4",
                torneioId: "t-1",
                rodada: 4,
                jogador1Id: "u1",
                jogador2Id: null,
                deckJogador1Id: "d-clone",
                deckJogador2Id: null,
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
                tipoBye: "normal",
            }),
        ];

        const uc = criarUc(
            {
                buscarPorId: jest.fn().mockResolvedValue(original),
                listarPorDeckOriginalId: jest.fn().mockResolvedValue([copia]),
            },
            { listarPorDeckIds: jest.fn().mockResolvedValue(partidas) }
        );

        const resultado = await uc.executar({ id: "d-orig" });

        expect(resultado.estatisticas).toEqual({
            vitorias: 1,
            derrotas: 1,
            empates: 1,
            totalPartidas: 3,
            winrate: 33.3,
        });
    });

    it("deve lancar 404 quando deck nao existe", async () => {
        const uc = criarUc();

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

        const uc = BuscarDeck.criar(
            criarMockDeckGateway({ buscarPorId: jest.fn().mockResolvedValue(deck) }),
            criarMockUsuarioGateway(),
            criarMockPartidaGateway()
        );

        const resultado = await uc.executar({ id: "d1" });

        expect(resultado.usuario).toEqual({ id: "u-desconhecido", nome: "u-desconhecido", excluido: false });
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

        const uc = criarUc({ buscarPorId: jest.fn().mockResolvedValue(deck) });

        await expect(uc.executar({ id: "d1" })).rejects.toBeInstanceOf(ErroPersonalizado);
        await expect(uc.executar({ id: "d1", usuarioId: "u2" })).rejects.toMatchObject({ status: 404 });
    });

    it("admin pode visualizar deck oculto de outro usuario", async () => {
        const deck = new Deck({
            id: "d1",
            nome: "Burn",
            formato: "legacy",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
            oculto: true,
        });

        const uc = criarUc({ buscarPorId: jest.fn().mockResolvedValue(deck) });

        const resultado = await uc.executar({ id: "d1", usuarioId: "admin", isAdmin: true });
        expect(resultado.id).toBe("d1");
    });

    it("copia travada de torneio (oculto) e visivel sem ser dono", async () => {
        const deck = new Deck({
            id: "d-clone",
            nome: "Burn",
            formato: "legacy",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
            oculto: true,
            travado: true,
            torneioId: "t-1",
            deckOriginalId: "d-orig",
        });

        const uc = criarUc({ buscarPorId: jest.fn().mockResolvedValue(deck) });

        const resultado = await uc.executar({ id: "d-clone", usuarioId: "outro" });
        expect(resultado.id).toBe("d-clone");
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

        const uc = criarUc({ buscarPorId: jest.fn().mockResolvedValue(deck) });

        const resultado = await uc.executar({ id: "d1", usuarioId: "u1" });

        expect(resultado.id).toBe("d1");
    });

    it("conta mirror match do mesmo deck original (vitória, derrota e empate)", async () => {
        const original = new Deck({
            id: "d-orig",
            nome: "Burn",
            formato: "legacy",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
        });
        const c1 = new Deck({
            id: "c1",
            nome: "Burn",
            formato: "legacy",
            maindeck: [],
            sideboard: [],
            usuarioId: "u1",
            travado: true,
            deckOriginalId: "d-orig",
            torneioId: "t-1",
        });
        const c2 = new Deck({
            id: "c2",
            nome: "Burn",
            formato: "legacy",
            maindeck: [],
            sideboard: [],
            usuarioId: "u2",
            travado: true,
            deckOriginalId: "d-orig",
            torneioId: "t-1",
        });

        const partidas = [
            new Partida({
                id: "m1",
                torneioId: "t-1",
                rodada: 1,
                jogador1Id: "u1",
                jogador2Id: "u2",
                deckJogador1Id: "c1",
                deckJogador2Id: "c2",
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
            }),
            new Partida({
                id: "m2",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u1",
                jogador2Id: "u2",
                deckJogador1Id: "c1",
                deckJogador2Id: "c2",
                vitoriasJogador1: 0,
                vitoriasJogador2: 2,
                status: "finalizada",
            }),
            new Partida({
                id: "m3",
                torneioId: "t-1",
                rodada: 3,
                jogador1Id: "u1",
                jogador2Id: "u2",
                deckJogador1Id: "c1",
                deckJogador2Id: "c2",
                vitoriasJogador1: 1,
                vitoriasJogador2: 1,
                status: "finalizada",
            }),
            new Partida({
                id: "pend",
                torneioId: "t-1",
                rodada: 4,
                jogador1Id: "u1",
                jogador2Id: "u2",
                deckJogador1Id: "c1",
                deckJogador2Id: "c2",
                vitoriasJogador1: 0,
                vitoriasJogador2: 0,
                status: "pendente",
            }),
        ];

        const uc = criarUc(
            {
                buscarPorId: jest.fn().mockResolvedValue(original),
                listarPorDeckOriginalId: jest.fn().mockResolvedValue([c1, c2]),
            },
            { listarPorDeckIds: jest.fn().mockResolvedValue(partidas) },
        );

        const resultado = await uc.executar({ id: "d-orig" });
        expect(resultado.estatisticas).toEqual({
            vitorias: 1,
            derrotas: 1,
            empates: 1,
            totalPartidas: 3,
            winrate: 33.3,
        });
    });
});
