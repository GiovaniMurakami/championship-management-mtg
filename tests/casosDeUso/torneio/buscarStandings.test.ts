import { BuscarStandings } from "../../../src/casosDeUso/torneio/buscarStandings";
import { criarMockTorneioGateway, criarMockInscricaoGateway, criarMockPartidaGateway, criarMockUsuarioGateway, criarMockDeckGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { Deck } from "../../../src/dominio/entidade/deck";

describe("BuscarStandings", () => {
    const torneioEmAndamento = new Torneio({
        id: "t-1", nome: "T", horario: new Date(), formato: "legacy",
        donoId: "d", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
    });

    const torneioAberto = new Torneio({
        id: "t-2", nome: "T2", horario: new Date(), formato: "legacy",
        donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
    });

    it("deve retornar standings com estatísticas quando torneio em andamento", async () => {
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkIn: true, checkInRodada: 1, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkIn: true, checkInRodada: 1, dropped: false }),
        ];
        const partidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" }),
            new Usuario({ id: "u-2", nome: "Maria", email: "m@e.com", senha: "s" }),
        ];

        const uc = BuscarStandings.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({ listarPorTorneio: jest.fn().mockResolvedValue(partidas) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
            criarMockDeckGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-1" });

        expect(resultado.standings).toHaveLength(2);
        expect(resultado.standings[0].usuario.nome).toBe("João");
        expect(resultado.standings[0].pontosMesa).toBe(3);
        expect(resultado.standings[0].vitoriasPartida).toBe(1);
        expect(resultado.standings[1].usuario.nome).toBe("Maria");
        expect(resultado.standings[1].pontosMesa).toBe(0);
    });

    it("deve retornar standings sem estatísticas quando inscricoes_abertas", async () => {
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-2", usuarioId: "u-1", checkIn: false, checkInRodada: -1, dropped: false }),
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" }),
        ];

        const uc = BuscarStandings.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioAberto) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
            criarMockDeckGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-2" });

        expect(resultado.standings).toHaveLength(1);
        expect(resultado.standings[0].pontosMesa).toBe(0);
        expect(resultado.standings[0].mwp).toBe(0);
    });

    it("deve incluir informações de deck quando disponíveis", async () => {
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", deckId: "d-1", checkIn: true, checkInRodada: 1, dropped: false }),
        ];
        const partidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: null, vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" }),
        ];
        const decks = [
            new Deck({ id: "d-1", nome: "Burn", formato: "legacy", maindeck: [], sideboard: [], usuarioId: "u-1" }),
        ];

        const uc = BuscarStandings.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({ listarPorTorneio: jest.fn().mockResolvedValue(partidas) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue(decks) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1" });

        expect(resultado.standings[0].deckId).toBe("d-1");
        expect(resultado.standings[0].deckNome).toBe("Burn");
    });

    it("deve lançar erro se torneio não encontrado", async () => {
        const uc = BuscarStandings.criar(
            criarMockTorneioGateway(),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ torneioId: "x" })
        ).rejects.toMatchObject({ status: 404 });
    });
});
