import { Partida } from "../../../src/dominio/entidade/partida";

describe("Partida", () => {
    it("deve criar uma instância com todos os campos", () => {
        const partida = new Partida({
            id: "p-1",
            torneioId: "t-1",
            rodada: 1,
            jogador1Id: "j1",
            jogador2Id: "j2",
            deckJogador1Id: "d1",
            deckJogador2Id: "d2",
            vitoriasJogador1: 2,
            vitoriasJogador2: 1,
            status: "finalizada",
            criadoEm: new Date("2025-01-01"),
        });

        expect(partida.id).toBe("p-1");
        expect(partida.torneioId).toBe("t-1");
        expect(partida.rodada).toBe(1);
        expect(partida.jogador1Id).toBe("j1");
        expect(partida.jogador2Id).toBe("j2");
        expect(partida.vitoriasJogador1).toBe(2);
        expect(partida.vitoriasJogador2).toBe(1);
        expect(partida.status).toBe("finalizada");
    });

    it("deve incluir observação de contestação quando informada", () => {
        const partida = new Partida({
            id: "p-1",
            torneioId: "t-1",
            rodada: 1,
            jogador1Id: "j1",
            jogador2Id: "j2",
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
            status: "finalizada",
            contestado: true,
            observacaoContestacao: "Placar invertido",
        });

        expect(partida.contestado).toBe(true);
        expect(partida.observacaoContestacao).toBe("Placar invertido");
    });

    describe("criar", () => {
        it("deve criar partida normal com status pendente e vitórias zeradas", () => {
            const partida = Partida.criar({
                torneioId: "t-1",
                rodada: 1,
                jogador1Id: "j1",
                jogador2Id: "j2",
            });

            expect(partida.id).toBeDefined();
            expect(partida.vitoriasJogador1).toBe(0);
            expect(partida.vitoriasJogador2).toBe(0);
            expect(partida.status).toBe("pendente");
        });

        it("deve criar bye com status finalizada e 2-0 automaticamente", () => {
            const partida = Partida.criar({
                torneioId: "t-1",
                rodada: 1,
                jogador1Id: "j1",
                jogador2Id: null,
            });

            expect(partida.jogador2Id).toBeNull();
            expect(partida.vitoriasJogador1).toBe(2);
            expect(partida.vitoriasJogador2).toBe(0);
            expect(partida.status).toBe("finalizada");
        });

        it("deve incluir deck ids quando fornecidos", () => {
            const partida = Partida.criar({
                torneioId: "t-1",
                rodada: 1,
                jogador1Id: "j1",
                jogador2Id: "j2",
                deckJogador1Id: "d1",
                deckJogador2Id: "d2",
            });

            expect(partida.deckJogador1Id).toBe("d1");
            expect(partida.deckJogador2Id).toBe("d2");
        });

        it("deve gerar ids únicos", () => {
            const p1 = Partida.criar({ torneioId: "t", rodada: 1, jogador1Id: "a", jogador2Id: "b" });
            const p2 = Partida.criar({ torneioId: "t", rodada: 1, jogador1Id: "c", jogador2Id: "d" });
            expect(p1.id).not.toBe(p2.id);
        });
    });
});
