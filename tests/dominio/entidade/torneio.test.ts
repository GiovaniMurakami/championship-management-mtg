import { Torneio } from "../../../src/dominio/entidade/torneio";

describe("Torneio", () => {
    it("deve criar uma instância com todos os campos", () => {
        const torneio = new Torneio({
            id: "t-1",
            nome: "Campeonato Legacy",
            horario: new Date("2025-06-01T14:00:00Z"),
            formato: "legacy",
            donoId: "user-1",
            status: "em_andamento",
            rodadaAtual: 2,
            totalRodadas: 4,
            premio: "Booster Box",
            criadoEm: new Date("2025-05-01"),
        });

        expect(torneio.id).toBe("t-1");
        expect(torneio.nome).toBe("Campeonato Legacy");
        expect(torneio.formato).toBe("legacy");
        expect(torneio.donoId).toBe("user-1");
        expect(torneio.status).toBe("em_andamento");
        expect(torneio.rodadaAtual).toBe(2);
        expect(torneio.totalRodadas).toBe(4);
        expect(torneio.premio).toBe("Booster Box");
    });

    it("deve definir criadoEm automaticamente quando não informado", () => {
        const antes = new Date();
        const torneio = new Torneio({
            id: "t-1",
            nome: "T",
            horario: new Date(),
            formato: "standard",
            donoId: "u",
            status: "inscricoes_abertas",
            rodadaAtual: 0,
            totalRodadas: 0,
        });
        const depois = new Date();

        expect(torneio.criadoEm.getTime()).toBeGreaterThanOrEqual(antes.getTime());
        expect(torneio.criadoEm.getTime()).toBeLessThanOrEqual(depois.getTime());
    });

    describe("criar", () => {
        it("deve gerar id e valores padrão automaticamente", () => {
            const torneio = Torneio.criar({
                nome: "Torneio Teste",
                horario: new Date("2025-06-01T14:00:00Z"),
                formato: "modern",
                donoId: "user-1",
                premio: "Playmat",
            });

            expect(torneio.id).toBeDefined();
            expect(torneio.id.length).toBeGreaterThan(0);
            expect(torneio.nome).toBe("Torneio Teste");
            expect(torneio.status).toBe("inscricoes_abertas");
            expect(torneio.rodadaAtual).toBe(0);
            expect(torneio.totalRodadas).toBe(0);
            expect(torneio.premio).toBe("Playmat");
            expect(torneio.criadoEm).toBeInstanceOf(Date);
        });

        it("deve funcionar sem prêmio", () => {
            const torneio = Torneio.criar({
                nome: "Torneio Simples",
                horario: new Date(),
                formato: "pauper",
                donoId: "user-2",
            });

            expect(torneio.premio).toBeUndefined();
        });

        it("deve gerar ids únicos", () => {
            const t1 = Torneio.criar({ nome: "A", horario: new Date(), formato: "f", donoId: "u" });
            const t2 = Torneio.criar({ nome: "B", horario: new Date(), formato: "f", donoId: "u" });
            expect(t1.id).not.toBe(t2.id);
        });
    });
});
