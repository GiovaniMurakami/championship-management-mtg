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
        donoId: "d", status: "em_andamento", rodadaAtual: 2, totalRodadas: 3,
    });

    const torneioAberto = new Torneio({
        id: "t-2", nome: "T2", horario: new Date(), formato: "legacy",
        donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
    });

    it("deve retornar standings sem estatÃ­sticas quando torneio em andamento na rodada 1", async () => {
        const torneioRodada1 = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "legacy",
            donoId: "d", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
        });
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: false }),
        ];
        const partidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "JoÃ£o", email: "j@e.com", senha: "s" }),
            new Usuario({ id: "u-2", nome: "Maria", email: "m@e.com", senha: "s" }),
        ];

        const uc = BuscarStandings.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioRodada1) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({ listarPorTorneio: jest.fn().mockResolvedValue(partidas) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
            criarMockDeckGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-1" });

        expect(resultado.standings).toHaveLength(2);
        expect(resultado.standings[0].pontosMesa).toBe(0);
        expect(resultado.standings[1].pontosMesa).toBe(0);
        expect(resultado.standings[0].mwp).toBe(0);
    });

    it("deve retornar standings com estatÃ­sticas quando torneio em andamento", async () => {
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: false }),
        ];
        const partidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "JoÃ£o", email: "j@e.com", senha: "s" }),
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
        expect(resultado.standings[0].usuario.nome).toBe("JoÃ£o");
        expect(resultado.standings[0].pontosMesa).toBe(3);
        expect(resultado.standings[0].vitoriasPartida).toBe(1);
        expect(resultado.standings[1].usuario.nome).toBe("Maria");
        expect(resultado.standings[1].pontosMesa).toBe(0);
    });

    it("deve retornar standings sem estatÃ­sticas quando inscricoes_abertas", async () => {
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-2", usuarioId: "u-1", checkInRodada: -1, dropped: false }),
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "JoÃ£o", email: "j@e.com", senha: "s" }),
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

    it("deve incluir informaÃ§Ãµes de deck quando disponÃ­veis", async () => {
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", deckId: "d-1", checkInRodada: 1, dropped: false }),
        ];
        const partidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: null, vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "JoÃ£o", email: "j@e.com", senha: "s" }),
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

    it("deve lanÃ§ar erro se torneio nÃ£o encontrado", async () => {
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

    it("deve retornar standings completos (incluindo Ãºltima rodada) quando torneio finalizado", async () => {
        const torneioFinalizado = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "legacy",
            donoId: "d", status: "finalizado", rodadaAtual: 2, totalRodadas: 2,
        });
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 2, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 2, dropped: false }),
        ];
        // rodada 1: u-1 vence u-2; rodada 2: u-2 vence u-1
        const partidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
            new Partida({ id: "p2", torneioId: "t-1", rodada: 2, jogador1Id: "u-2", jogador2Id: "u-1", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "JoÃ£o", email: "j@e.com", senha: "s" }),
            new Usuario({ id: "u-2", nome: "Maria", email: "m@e.com", senha: "s" }),
        ];

        const uc = BuscarStandings.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioFinalizado) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({ listarPorTorneio: jest.fn().mockResolvedValue(partidas) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
            criarMockDeckGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-1" });

        // Ambos com 1 vitÃ³ria e 1 derrota â€” 3 pontos cada
        expect(resultado.standings).toHaveLength(2);
        expect(resultado.standings[0].pontosMesa).toBe(3);
        expect(resultado.standings[1].pontosMesa).toBe(3);
    });

    it("deve incluir jogador dropado nos standings com suas estatÃ­sticas reais", async () => {
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: true }), // dropado
        ];
        const partidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "JoÃ£o", email: "j@e.com", senha: "s" }),
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
        // u-1 venceu, deve estar na frente
        const standingDropado = resultado.standings.find(s => s.usuario.id === "u-2");
        expect(standingDropado).toBeDefined();
        expect(standingDropado!.dropped).toBe(true);
        expect(standingDropado!.pontosMesa).toBe(0);
        expect(standingDropado!.derrotasPartida).toBe(1);
    });

    it("deve retornar checkInRodada corretamente", async () => {
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 2, dropped: false, byeCount: 0 }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: false, byeCount: 0 }), // nÃ£o fez check-in para rodada 2
        ];
        const partidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "JoÃ£o", email: "j@e.com", senha: "s" }),
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

        const s1 = resultado.standings.find(s => s.usuario.id === "u-1")!;
        const s2 = resultado.standings.find(s => s.usuario.id === "u-2")!;
        expect(s1.checkInRodada).toBe(2);
        expect(s2.checkInRodada).toBe(1);
    });

    it("deve contabilizar BYE no total de partidas jogadas", async () => {
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: false }),
            new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 1, dropped: false }),
        ];
        const partidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
            new Partida({ id: "p2", torneioId: "t-1", rodada: 1, jogador1Id: "u-3", jogador2Id: null, vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }), // BYE
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "A", email: "a@e.com", senha: "s" }),
            new Usuario({ id: "u-2", nome: "B", email: "b@e.com", senha: "s" }),
            new Usuario({ id: "u-3", nome: "C", email: "c@e.com", senha: "s" }),
        ];

        const torneioR2 = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "legacy",
            donoId: "d", status: "finalizado", rodadaAtual: 2, totalRodadas: 2,
        });

        const uc = BuscarStandings.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioR2) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({ listarPorTorneio: jest.fn().mockResolvedValue(partidas) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
            criarMockDeckGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-1" });

        // u-3 has BYE counted as a match
        const sU3 = resultado.standings.find(s => s.usuario.id === "u-3")!;
        expect(sU3.pontosMesa).toBe(3); // vitÃ³ria por BYE = 3 pontos
        expect(sU3.vitoriasPartida).toBe(1);
    });

    it("deve retornar standings vazios quando nÃ£o hÃ¡ inscriÃ§Ãµes", async () => {
        const uc = BuscarStandings.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioAberto) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue([]) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([]) }),
            criarMockDeckGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-2" });

        expect(resultado.standings).toHaveLength(0);
    });
});

