import { RankingLiga } from "../../../src/casosDeUso/liga/rankingLiga";
import {
    criarMockLigaGateway,
    criarMockPartidaGateway,
    criarMockInscricaoGateway,
    criarMockDeckGateway,
    criarMockUsuarioGateway,
} from "../../mocks/gateways";
import { Liga } from "../../../src/dominio/entidade/liga";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("RankingLiga", () => {
    const liga = new Liga({
        id: "liga-1",
        nome: "Liga Nacional",
        donoId: "user-admin",
        torneioIds: ["torneio-1"],
    });

    const usuario1 = new Usuario({ id: "user-1", nome: "Alice", email: "a@a.com", senha: "hash", role: "user" });
    const usuario2 = new Usuario({ id: "user-2", nome: "Bob", email: "b@b.com", senha: "hash", role: "user" });

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
            criarMockUsuarioGateway()
        );

        await expect(uc.executar({ ligaId: "inexistente" })).rejects.toMatchObject({ status: 404 });
    });

    it("deve retornar ranking vazio se não houver partidas finalizadas", async () => {
        const uc = RankingLiga.criar(
            criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) }),
            criarMockPartidaGateway(),
            criarMockInscricaoGateway(),
            criarMockDeckGateway(),
            criarMockUsuarioGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        expect(resultado.rankingJogadores).toEqual([]);
        expect(resultado.rankingDecks).toEqual([]);
        expect(resultado.rankingCartas).toEqual([]);
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
            criarMockInscricaoGateway(),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue([deck1, deck2]) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2]) })
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        expect(resultado.rankingJogadores).toHaveLength(2);
        expect(resultado.rankingJogadores[0].jogador.nome).toBe("Alice");
        expect(resultado.rankingJogadores[0].vitorias).toBe(1);
        expect(resultado.rankingJogadores[0].pontos).toBe(3);
        expect(resultado.rankingJogadores[1].jogador.nome).toBe("Bob");
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
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2]) })
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
            criarMockInscricaoGateway(),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue([deck1, deck2]) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario1, usuario2]) })
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        expect(resultado.rankingDecks).toHaveLength(2);
        const burnDeck = resultado.rankingDecks.find((d) => d.nome === "Boros Burn");
        expect(burnDeck).toBeDefined();
        expect(burnDeck!.totalUsos).toBe(1);
        expect(burnDeck!.vitorias).toBe(1);
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
            criarMockUsuarioGateway()
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
            criarMockUsuarioGateway()
        );

        const resultado = await uc.executar({ ligaId: "liga-1" });

        expect(resultado.rankingJogadores).toHaveLength(0);
    });
});
