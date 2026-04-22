import { Inscricao } from "../../../src/dominio/entidade/inscricao";

describe("Inscricao", () => {
    it("deve criar uma instância com todos os campos", () => {
        const inscricao = new Inscricao({
            id: "insc-1",
            torneioId: "torneio-1",
            usuarioId: "user-1",
            deckId: "deck-1",
            checkInRodada: 1,
            dropped: false,
            criadoEm: new Date("2025-01-01"),
        });

        expect(inscricao.id).toBe("insc-1");
        expect(inscricao.torneioId).toBe("torneio-1");
        expect(inscricao.usuarioId).toBe("user-1");
        expect(inscricao.deckId).toBe("deck-1");
        expect(inscricao.checkInRodada).toBe(1);
        expect(inscricao.dropped).toBe(false);
        expect(inscricao.criadoEm).toEqual(new Date("2025-01-01"));
    });

    it("deve definir criadoEm automaticamente quando não informado", () => {
        const antes = new Date();
        const inscricao = new Inscricao({
            id: "insc-1",
            torneioId: "t",
            usuarioId: "u",
            checkInRodada: -1,
            dropped: false,
        });
        const depois = new Date();

        expect(inscricao.criadoEm.getTime()).toBeGreaterThanOrEqual(antes.getTime());
        expect(inscricao.criadoEm.getTime()).toBeLessThanOrEqual(depois.getTime());
    });

    describe("criar", () => {
        it("deve gerar id e valores padrão automaticamente", () => {
            const inscricao = Inscricao.criar({
                torneioId: "torneio-1",
                usuarioId: "user-1",
            });

            expect(inscricao.id).toBeDefined();
            expect(inscricao.id.length).toBeGreaterThan(0);
            expect(inscricao.torneioId).toBe("torneio-1");
            expect(inscricao.usuarioId).toBe("user-1");
            expect(inscricao.checkInRodada).toBe(-1);
            expect(inscricao.dropped).toBe(false);
            expect(inscricao.criadoEm).toBeInstanceOf(Date);
        });

        it("deve aceitar deckId opcional", () => {
            const inscricao = Inscricao.criar({
                torneioId: "torneio-1",
                usuarioId: "user-1",
                deckId: "deck-1",
            });

            expect(inscricao.deckId).toBe("deck-1");
        });

        it("deve gerar ids únicos", () => {
            const i1 = Inscricao.criar({ torneioId: "t", usuarioId: "u1" });
            const i2 = Inscricao.criar({ torneioId: "t", usuarioId: "u2" });
            expect(i1.id).not.toBe(i2.id);
        });
    });
});
