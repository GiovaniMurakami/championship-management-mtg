import { RankingLiga } from "../../../src/casosDeUso/liga/rankingLiga";
import {
    criarMockLigaGateway,
    criarMockPartidaGateway,
    criarMockInscricaoGateway,
    criarMockDeckGateway,
    criarMockUsuarioGateway,
    criarMockTimeGateway,
} from "../../mocks/gateways";
import { Liga } from "../../../src/dominio/entidade/liga";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { Time } from "../../../src/dominio/entidade/time";

describe("RankingLiga", () => {
    const liga = new Liga({
        id: "liga-1",
        nome: "Liga Nacional",
        donoId: "user-admin",
        torneioIds: ["torneio-1"],
    });

    const usuario1 = new Usuario({
        id: "user-1",
        nome: "Alice",
        email: "a@a.com",
        senha: "hash",
        role: "user",
        nickMTGO: "alice_mtgo",
    });
    const usuario2 = new Usuario({
        id: "user-2",
        nome: "Bob",
        email: "b@b.com",
        senha: "hash",
        role: "user",
        nickMTGO: "bob_mtgo",
    });

    const deck1 = new Deck({
        id: "deck-1",
        nome: "Burn",
        nomeConsolidado: "Boros Burn",
        formato: "modern",
        maindeck: [
            { nome: "lightning bolt", quantidade: 4 },
            { nome: "goblin guide", quantidade: 4 },
        ],
        sideboard: [],
        usuarioId: "user-1",
    });

    const deck2 = new Deck({
        id: "deck-2",
        nome: "Control",
        nomeConsolidado: "UW Control",
        formato: "modern",
        maindeck: [
            { nome: "counterspell", quantidade: 4 },
            { nome: "lightning bolt", quantidade: 2 },
        ],
        sideboard: [],
        usuarioId: "user-2",
    });

    it("deve lançar 404 se liga não existir", async () => {
        const uc = RankingLiga.criar(
            criarMockLigaGateway(),
            criarMockPartidaGateway(),
            criarMockInscricaoGateway(),
            criarMockDeckGateway(),
            criarMockUsuarioGateway(),
            criarMockTimeGateway()
        );

        await expect(uc.executar({ ligaId: "inexistente" })).rejects.toMatchObject({ status: 404 });
    });

    it("deve retornar ranking vazio se não houver partidas finalizadas", async () => {
        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) }),
            criarMockPartidaGateway(),
            criarMockInscricaoGateway(),
            criarMockDeckGateway(),
            criarMockUsuarioGateway(),
            criarMockTimeGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        expect(resultado.rankingJogadores).toEqual([]);
        expect(resultado.totalJogadores).toBe(0);
        expect(resultado.rankingDecks).toEqual([]);
        expect(resultado.totalDecks).toBe(0);
        expect(resultado.rankingCartas).toEqual([]);
        expect(resultado.totalCartas).toBe(0);
    });

    it("deve calcular ranking de jogadores corretamente", async () => {
        // user-1 vence user-2 por 2-0
        const partida = new Partida({
            id: "partida-1",
            torneioId: "torneio-1",
            rodada: 1,
            jogador1Id: "user-1",
            jogador2Id: "user-2",
            deckJogador1Id: "deck-1",
            deckJogador2Id: "deck-2",
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
            status: "finalizada",
        });

        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([partida]) }),
            criarMockInscricaoGateway({
                listarPorTorneios: jest.fn().mockResolvedValue([
                    new Inscricao({ id: "i-1", torneioId: "torneio-1", usuarioId: "user-1", deckId: "deck-1" }),
                    new Inscricao({ id: "i-2", torneioId: "torneio-1", usuarioId: "user-2", deckId: "deck-2" }),
                ]),
            }),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue([deck1, deck2]) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2]) }),
            criarMockTimeGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        expect(resultado.rankingJogadores).toHaveLength(2);
        expect(resultado.rankingJogadores[0].jogador.nome).toBe("alice_mtgo");
        expect(resultado.rankingJogadores[0].vitorias).toBe(1);
        expect(resultado.rankingJogadores[0].pontos).toBe(3);
        expect(resultado.rankingJogadores[1].jogador.nome).toBe("bob_mtgo");
        expect(resultado.rankingJogadores[1].derrotas).toBe(1);
        expect(resultado.rankingJogadores[1].pontos).toBe(0);
    });

    it("deve calcular empate corretamente", async () => {
        const partida = new Partida({
            id: "partida-1",
            torneioId: "torneio-1",
            rodada: 1,
            jogador1Id: "user-1",
            jogador2Id: "user-2",
            deckJogador1Id: "deck-1",
            deckJogador2Id: "deck-2",
            vitoriasJogador1: 1,
            vitoriasJogador2: 1,
            status: "finalizada",
        });

        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([partida]) }),
            criarMockInscricaoGateway(),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue([deck1, deck2]) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2]) }),
            criarMockTimeGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        expect(resultado.rankingJogadores[0].empates).toBe(1);
        expect(resultado.rankingJogadores[0].pontos).toBe(1);
        expect(resultado.rankingJogadores[1].empates).toBe(1);
        expect(resultado.rankingJogadores[1].pontos).toBe(1);
    });

    it("deve calcular ranking de decks agrupando por nomeConsolidado", async () => {
        const partida = new Partida({
            id: "partida-1",
            torneioId: "torneio-1",
            rodada: 1,
            jogador1Id: "user-1",
            jogador2Id: "user-2",
            deckJogador1Id: "deck-1",
            deckJogador2Id: "deck-2",
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
            status: "finalizada",
        });

        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([partida]) }),
            criarMockInscricaoGateway({
                listarPorTorneios: jest.fn().mockResolvedValue([
                    new Inscricao({ id: "i-1", torneioId: "torneio-1", usuarioId: "user-1", deckId: "deck-1" }),
                    new Inscricao({ id: "i-2", torneioId: "torneio-1", usuarioId: "user-2", deckId: "deck-2" }),
                ]),
            }),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue([deck1, deck2]) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2]) }),
            criarMockTimeGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        expect(resultado.rankingDecks).toHaveLength(2);
        const burnDeck = resultado.rankingDecks.find((d) => d.nome === "Boros Burn");
        expect(burnDeck).toBeDefined();
        expect(burnDeck!.totalUsos).toBe(1);
        expect(burnDeck!.totalDecks).toBe(1);
        expect(burnDeck!.vitorias).toBe(1);
        expect(burnDeck!.derrotas).toBe(0);
        expect(burnDeck!.empates).toBe(0);
        expect(burnDeck!.winrate).toBe(100);
        expect(burnDeck!.loserate).toBe(0);
        expect(burnDeck!.cartaRepresentativa).toBe("goblin guide");

        const controlDeck = resultado.rankingDecks.find((d) => d.nome === "UW Control");
        expect(controlDeck).toBeDefined();
        expect(controlDeck!.vitorias).toBe(0);
        expect(controlDeck!.derrotas).toBe(1);
        expect(controlDeck!.winrate).toBe(0);
        expect(controlDeck!.loserate).toBe(100);
        expect(controlDeck!.totalDecks).toBe(1);
        expect(controlDeck!.cartaRepresentativa).toBe("counterspell");

        expect(resultado.totalDecks).toBe(2);
    });

    it("deve calcular ranking de cartas somando cópias de todos os decks", async () => {
        // deck1: lightning bolt x4, goblin guide x4
        // deck2: counterspell x4, lightning bolt x2
        // Resultado esperado: lightning bolt = 6 cópias (2 decks), goblin guide = 4 (1 deck), counterspell = 4 (1 deck)
        const inscricao1 = new Inscricao({ id: "i-1", torneioId: "torneio-1", usuarioId: "user-1", deckId: "deck-1" });
        const inscricao2 = new Inscricao({ id: "i-2", torneioId: "torneio-1", usuarioId: "user-2", deckId: "deck-2" });

        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) }),
            criarMockPartidaGateway(),
            criarMockInscricaoGateway({
                listarPorTorneios: jest.fn().mockResolvedValue([inscricao1, inscricao2]),
            }),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue([deck1, deck2]) }),
            criarMockUsuarioGateway(),
            criarMockTimeGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        const bolt = resultado.rankingCartas.find((c) => c.nome === "lightning bolt");
        expect(bolt).toBeDefined();
        expect(bolt!.totalCopias).toBe(6);
        expect(bolt!.totalDecks).toBe(2);

        const goblin = resultado.rankingCartas.find((c) => c.nome === "goblin guide");
        expect(goblin).toBeDefined();
        expect(goblin!.totalCopias).toBe(4);
        expect(goblin!.totalDecks).toBe(1);

        // lightning bolt deve ser o primeiro (maior totalCopias)
        expect(resultado.rankingCartas[0].nome).toBe("lightning bolt");
    });

    it("deve calcular winrate de empate corretamente por arquétipo", async () => {
        const partida = new Partida({
            id: "partida-1",
            torneioId: "torneio-1",
            rodada: 1,
            jogador1Id: "user-1",
            jogador2Id: "user-2",
            deckJogador1Id: "deck-1",
            deckJogador2Id: "deck-2",
            vitoriasJogador1: 1,
            vitoriasJogador2: 1,
            status: "finalizada",
        });

        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([partida]) }),
            criarMockInscricaoGateway(),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue([deck1, deck2]) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2]) }),
            criarMockTimeGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        const burnDeck = resultado.rankingDecks.find((d) => d.nome === "Boros Burn");
        expect(burnDeck!.empates).toBe(1);
        expect(burnDeck!.winrate).toBe(0);
        expect(burnDeck!.loserate).toBe(0);
    });

    it("deve respeitar limite de exibição por seção", async () => {
        const partida = new Partida({
            id: "partida-1",
            torneioId: "torneio-1",
            rodada: 1,
            jogador1Id: "user-1",
            jogador2Id: "user-2",
            deckJogador1Id: "deck-1",
            deckJogador2Id: "deck-2",
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
            status: "finalizada",
        });

        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([partida]) }),
            criarMockInscricaoGateway(),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue([deck1, deck2]) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2]) }),
            criarMockTimeGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1", limiteJogadores: 1, limiteDecks: 1, limiteCartas: 1 });

        expect(resultado.rankingJogadores).toHaveLength(1);
        expect(resultado.totalJogadores).toBe(2);
        expect(resultado.rankingDecks).toHaveLength(1);
        expect(resultado.totalDecks).toBe(2);
        expect(resultado.rankingCartas).toHaveLength(1);
        expect(resultado.totalCartas).toBeGreaterThan(1);

        const completo = await uc.executar({ ligaId: "liga-1" });
        expect(completo.rankingJogadores).toHaveLength(2);
    });

    it("deve ignorar partidas pendentes no ranking", async () => {
        const partidaPendente = new Partida({
            id: "partida-1",
            torneioId: "torneio-1",
            rodada: 1,
            jogador1Id: "user-1",
            jogador2Id: "user-2",
            vitoriasJogador1: 0,
            vitoriasJogador2: 0,
            status: "pendente",
        });

        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([partidaPendente]) }),
            criarMockInscricaoGateway(),
            criarMockDeckGateway(),
            criarMockUsuarioGateway(),
            criarMockTimeGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        expect(resultado.rankingJogadores).toHaveLength(0);
    });

    it("deve calcular bye como vitória, empate ou derrota apenas para jogador1", async () => {
        const partidas = [
            new Partida({
                id: "bye-vitoria",
                torneioId: "torneio-1",
                rodada: 1,
                jogador1Id: "user-1",
                jogador2Id: null,
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
            }),
            new Partida({
                id: "bye-empate",
                torneioId: "torneio-1",
                rodada: 2,
                jogador1Id: "user-2",
                jogador2Id: null,
                vitoriasJogador1: 1,
                vitoriasJogador2: 1,
                status: "finalizada",
            }),
            new Partida({
                id: "bye-derrota",
                torneioId: "torneio-1",
                rodada: 3,
                jogador1Id: "user-3",
                jogador2Id: null,
                vitoriasJogador1: 0,
                vitoriasJogador2: 1,
                status: "finalizada",
            }),
        ];
        const usuario3 = new Usuario({ id: "user-3", nome: "Carol", email: "c@c.com", senha: "hash" });
        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue(partidas) }),
            criarMockInscricaoGateway(),
            criarMockDeckGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2, usuario3]) }),
            criarMockTimeGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        const alice = resultado.rankingJogadores.find((r) => r.jogador.id === "user-1")!;
        const bob = resultado.rankingJogadores.find((r) => r.jogador.id === "user-2")!;
        const carol = resultado.rankingJogadores.find((r) => r.jogador.id === "user-3")!;
        expect(alice.vitorias).toBe(1);
        expect(alice.pontos).toBe(3);
        expect(bob.empates).toBe(1);
        expect(bob.pontos).toBe(1);
        expect(carol.derrotas).toBe(1);
        expect(carol.pontos).toBe(0);
    });

    it("deve calcular ranking por times agregando estatísticas dos membros", async () => {
        const ligaTimes = new Liga({
            id: "liga-times",
            nome: "Liga Times",
            donoId: "user-admin",
            torneioIds: ["torneio-1"],
            tipo: "times",
        });
        const partida = new Partida({
            id: "partida-1",
            torneioId: "torneio-1",
            rodada: 1,
            jogador1Id: "user-1",
            jogador2Id: "user-2",
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
            status: "finalizada",
        });
        const inscricoes = [
            new Inscricao({ id: "i-1", torneioId: "torneio-1", usuarioId: "user-1", timeId: "time-1" }),
            new Inscricao({ id: "i-2", torneioId: "torneio-1", usuarioId: "user-2", timeId: "time-2" }),
            new Inscricao({ id: "i-3", torneioId: "torneio-1", usuarioId: "sem-stats", timeId: "time-1" }),
            new Inscricao({ id: "i-4", torneioId: "torneio-1", usuarioId: "sem-time" }),
        ];
        const times = [
            new Time({ id: "time-1", nome: "Alpha", donoId: "user-1" }),
            new Time({ id: "time-2", nome: "Beta", donoId: "user-2" }),
        ];
        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(ligaTimes) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([partida]) }),
            criarMockInscricaoGateway({ listarPorTorneios: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockDeckGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2]) }),
            criarMockTimeGateway({ buscarVarios: jest.fn().mockResolvedValue(times) })
        );

        const resultado = await uc.executar({ ligaId: "liga-times", limiteJogadores: 1 });

        expect(resultado.tipo).toBe("times");
        expect(resultado.totalTimes).toBe(2);
        expect(resultado.rankingTimes).toEqual([
            {
                posicao: 1,
                time: { id: "time-1", nome: "Alpha" },
                vitorias: 1,
                derrotas: 0,
                empates: 0,
                pontos: 3,
            },
        ]);
    });

    it("deve calcular ranking de times por partida sem duplicar estatisticas por inscricao", async () => {
        const ligaTimes = new Liga({
            id: "liga-times",
            nome: "Liga Times",
            donoId: "user-admin",
            torneioIds: ["torneio-1", "torneio-2"],
            tipo: "times",
        });
        const partidas = [
            new Partida({
                id: "p1",
                torneioId: "torneio-1",
                rodada: 1,
                jogador1Id: "user-1",
                jogador2Id: "user-2",
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
            }),
            new Partida({
                id: "p2",
                torneioId: "torneio-2",
                rodada: 1,
                jogador1Id: "user-1",
                jogador2Id: "user-2",
                vitoriasJogador1: 2,
                vitoriasJogador2: 1,
                status: "finalizada",
            }),
        ];
        const inscricoes = [
            new Inscricao({ id: "i-1", torneioId: "torneio-1", usuarioId: "user-1", timeId: "time-1" }),
            new Inscricao({ id: "i-2", torneioId: "torneio-1", usuarioId: "user-2", timeId: "time-2" }),
            new Inscricao({ id: "i-3", torneioId: "torneio-2", usuarioId: "user-1", timeId: "time-1" }),
            new Inscricao({ id: "i-4", torneioId: "torneio-2", usuarioId: "user-2", timeId: "time-2" }),
        ];
        const times = [
            new Time({ id: "time-1", nome: "Alpha", donoId: "user-1" }),
            new Time({ id: "time-2", nome: "Beta", donoId: "user-2" }),
        ];
        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(ligaTimes) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue(partidas) }),
            criarMockInscricaoGateway({ listarPorTorneios: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockDeckGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2]) }),
            criarMockTimeGateway({ buscarVarios: jest.fn().mockResolvedValue(times) })
        );

        const resultado = await uc.executar({ ligaId: "liga-times" });

        expect(resultado.rankingTimes).toEqual([
            {
                posicao: 1,
                time: { id: "time-1", nome: "Alpha" },
                vitorias: 2,
                derrotas: 0,
                empates: 0,
                pontos: 6,
            },
            {
                posicao: 2,
                time: { id: "time-2", nome: "Beta" },
                vitorias: 0,
                derrotas: 2,
                empates: 0,
                pontos: 0,
            },
        ]);
    });

    it("deve respeitar limiteTimes e ignorar confronto entre membros do mesmo time", async () => {
        const ligaTimes = new Liga({
            id: "liga-times",
            nome: "Liga Times",
            donoId: "user-admin",
            torneioIds: ["torneio-1"],
            tipo: "times",
        });
        const partidas = [
            new Partida({
                id: "p1",
                torneioId: "torneio-1",
                rodada: 1,
                jogador1Id: "user-1",
                jogador2Id: "user-2",
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
            }),
            new Partida({
                id: "p2",
                torneioId: "torneio-1",
                rodada: 1,
                jogador1Id: "user-3",
                jogador2Id: null,
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
            }),
        ];
        const inscricoes = [
            new Inscricao({ id: "i-1", torneioId: "torneio-1", usuarioId: "user-1", timeId: "time-1" }),
            new Inscricao({ id: "i-2", torneioId: "torneio-1", usuarioId: "user-2", timeId: "time-1" }),
            new Inscricao({ id: "i-3", torneioId: "torneio-1", usuarioId: "user-3", timeId: "time-2" }),
        ];
        const times = [
            new Time({ id: "time-1", nome: "Alpha", donoId: "user-1" }),
            new Time({ id: "time-2", nome: "Beta", donoId: "user-3" }),
        ];
        const usuario3 = new Usuario({ id: "user-3", nome: "Carol", email: "c@c.com", senha: "hash" });
        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(ligaTimes) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue(partidas) }),
            criarMockInscricaoGateway({ listarPorTorneios: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockDeckGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2, usuario3]) }),
            criarMockTimeGateway({ buscarVarios: jest.fn().mockResolvedValue(times) })
        );

        const resultado = await uc.executar({ ligaId: "liga-times", limiteTimes: 1 });

        expect(resultado.totalTimes).toBe(2);
        expect(resultado.rankingTimes).toEqual([
            {
                posicao: 1,
                time: { id: "time-2", nome: "Beta" },
                vitorias: 1,
                derrotas: 0,
                empates: 0,
                pontos: 3,
            },
        ]);
    });

    it("deve incluir times inscritos sem partidas finalizadas no ranking coletivo", async () => {
        const ligaTimes = new Liga({
            id: "liga-times",
            nome: "Liga Times",
            donoId: "user-admin",
            torneioIds: ["torneio-1"],
            tipo: "times",
        });
        const partida = new Partida({
            id: "partida-1",
            torneioId: "torneio-1",
            rodada: 1,
            jogador1Id: "user-1",
            jogador2Id: "user-2",
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
            status: "finalizada",
        });
        const inscricoes = [
            new Inscricao({ id: "i-1", torneioId: "torneio-1", usuarioId: "user-1", timeId: "time-1" }),
            new Inscricao({ id: "i-2", torneioId: "torneio-1", usuarioId: "user-2", timeId: "time-2" }),
            new Inscricao({ id: "i-3", torneioId: "torneio-1", usuarioId: "user-3", timeId: "time-3" }),
        ];
        const usuario3 = new Usuario({ id: "user-3", nome: "Carol", email: "c@c.com", senha: "hash" });
        const times = [
            new Time({ id: "time-1", nome: "Alpha", donoId: "user-1" }),
            new Time({ id: "time-2", nome: "Beta", donoId: "user-2" }),
            new Time({ id: "time-3", nome: "Gamma", donoId: "user-3" }),
        ];
        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(ligaTimes) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([partida]) }),
            criarMockInscricaoGateway({ listarPorTorneios: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockDeckGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2, usuario3]) }),
            criarMockTimeGateway({ buscarVarios: jest.fn().mockResolvedValue(times) })
        );

        const resultado = await uc.executar({ ligaId: "liga-times" });

        expect(resultado.totalTimes).toBe(3);
        expect(resultado.rankingTimes).toEqual([
            {
                posicao: 1,
                time: { id: "time-1", nome: "Alpha" },
                vitorias: 1,
                derrotas: 0,
                empates: 0,
                pontos: 3,
            },
            {
                posicao: 2,
                time: { id: "time-2", nome: "Beta" },
                vitorias: 0,
                derrotas: 1,
                empates: 0,
                pontos: 0,
            },
            {
                posicao: 3,
                time: { id: "time-3", nome: "Gamma" },
                vitorias: 0,
                derrotas: 0,
                empates: 0,
                pontos: 0,
            },
        ]);
    });

    it("deve calcular ranking de times usando fallback por membros quando a inscricao nao tiver timeId", async () => {
        const ligaTimes = new Liga({
            id: "liga-times",
            nome: "Liga Times",
            donoId: "user-admin",
            torneioIds: ["torneio-1"],
            tipo: "times",
        });
        const partida = new Partida({
            id: "partida-1",
            torneioId: "torneio-1",
            rodada: 1,
            jogador1Id: "user-1",
            jogador2Id: "user-2",
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
            status: "finalizada",
        });
        const inscricoes = [
            new Inscricao({ id: "i-1", torneioId: "torneio-1", usuarioId: "user-1" }),
            new Inscricao({ id: "i-2", torneioId: "torneio-1", usuarioId: "user-2" }),
        ];
        const times = [
            new Time({ id: "time-1", nome: "Alpha", donoId: "user-1", membroIds: ["user-1"] }),
            new Time({ id: "time-2", nome: "Beta", donoId: "user-2", membroIds: ["user-2"] }),
        ];
        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(ligaTimes) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([partida]) }),
            criarMockInscricaoGateway({ listarPorTorneios: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockDeckGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2]) }),
            criarMockTimeGateway({
                buscarPorMembros: jest.fn().mockResolvedValue(times),
                buscarVarios: jest.fn().mockResolvedValue(times),
            })
        );

        const resultado = await uc.executar({ ligaId: "liga-times" });

        expect(resultado.totalTimes).toBe(2);
        expect(resultado.rankingTimes).toEqual([
            {
                posicao: 1,
                time: { id: "time-1", nome: "Alpha" },
                vitorias: 1,
                derrotas: 0,
                empates: 0,
                pontos: 3,
            },
            {
                posicao: 2,
                time: { id: "time-2", nome: "Beta" },
                vitorias: 0,
                derrotas: 1,
                empates: 0,
                pontos: 0,
            },
        ]);
    });

    it("deve usar nomes desconhecidos quando usuário, time ou deck não forem encontrados", async () => {
        const ligaTimes = new Liga({
            id: "liga-times",
            nome: "Liga Times",
            donoId: "user-admin",
            torneioIds: ["torneio-1"],
            tipo: "times",
        });
        const partida = new Partida({
            id: "partida-1",
            torneioId: "torneio-1",
            rodada: 1,
            jogador1Id: "user-1",
            jogador2Id: "user-2",
            deckJogador1Id: "deck-nao-encontrado",
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
            status: "finalizada",
        });
        const inscricoes = [
            new Inscricao({ id: "i-1", torneioId: "torneio-1", usuarioId: "user-1", timeId: "time-sem-nome" }),
        ];
        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(ligaTimes) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([partida]) }),
            criarMockInscricaoGateway({ listarPorTorneios: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue([]) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([]) }),
            criarMockTimeGateway({ buscarVarios: jest.fn().mockResolvedValue([]) })
        );

        const resultado = await uc.executar({ ligaId: "liga-times" });

        expect(resultado.rankingJogadores[0].jogador).toEqual({
            id: "user-1",
            nome: "user-1",
            excluido: false,
        });
        expect(resultado.rankingDecks[0].nome).toBe("deck-nao-encontrado");
        expect(resultado.rankingTimes![0].time.nome).toBe("Desconhecido");
    });

    it("deve acumular usos do mesmo deck e agrupar decks pelo mesmo nome consolidado", async () => {
        const usuario3 = new Usuario({ id: "user-3", nome: "Carol", email: "c@c.com", senha: "hash" });
        const deck3 = new Deck({
            id: "deck-3",
            nome: "Burn Variant",
            nomeConsolidado: "Boros Burn",
            formato: "modern",
            maindeck: [{ nome: "lightning bolt", quantidade: 4 }],
            sideboard: [],
            usuarioId: "user-3",
        });
        const partidas = [
            new Partida({
                id: "partida-1",
                torneioId: "torneio-1",
                rodada: 1,
                jogador1Id: "user-1",
                jogador2Id: "user-2",
                deckJogador1Id: "deck-1",
                deckJogador2Id: "deck-2",
                vitoriasJogador1: 0,
                vitoriasJogador2: 2,
                status: "finalizada",
            }),
            new Partida({
                id: "partida-2",
                torneioId: "torneio-1",
                rodada: 2,
                jogador1Id: "user-1",
                jogador2Id: "user-3",
                deckJogador1Id: "deck-1",
                deckJogador2Id: "deck-3",
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
            }),
            new Partida({
                id: "partida-3",
                torneioId: "torneio-1",
                rodada: 3,
                jogador1Id: "user-1",
                jogador2Id: "user-3",
                deckJogador1Id: "deck-1",
                deckJogador2Id: "deck-3",
                vitoriasJogador1: 1,
                vitoriasJogador2: 1,
                status: "finalizada",
            }),
        ];
        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue(partidas) }),
            criarMockInscricaoGateway(),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue([deck1, deck2, deck3]) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2, usuario3]) }),
            criarMockTimeGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        const boros = resultado.rankingDecks.find((d) => d.nome === "Boros Burn")!;
        expect(boros.totalUsos).toBe(5);
        expect(boros.vitorias).toBe(1);
        expect(boros.derrotas).toBe(2);
        expect(boros.empates).toBe(2);
        expect(resultado.rankingJogadores.find((r) => r.jogador.id === "user-2")!.vitorias).toBe(1);
    });
});
