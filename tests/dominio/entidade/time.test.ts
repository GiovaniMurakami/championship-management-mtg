import { Time } from "../../../src/dominio/entidade/time";

describe("Time", () => {
    it("deve criar uma instância com todos os campos", () => {
        const criadoEm = new Date("2025-01-01");
        const time = new Time({
            id: "time-1",
            nome: "Team Alpha",
            descricao: "O melhor time",
            imagemUrl: "https://example.com/img.png",
            donoId: "user-1",
            membroIds: ["user-1", "user-2"],
            solicitacoesPendentes: ["user-3"],
            conviteToken: "token-123",
            criadoEm,
        });

        expect(time.id).toBe("time-1");
        expect(time.nome).toBe("Team Alpha");
        expect(time.descricao).toBe("O melhor time");
        expect(time.imagemUrl).toBe("https://example.com/img.png");
        expect(time.donoId).toBe("user-1");
        expect(time.membroIds).toEqual(["user-1", "user-2"]);
        expect(time.solicitacoesPendentes).toEqual(["user-3"]);
        expect(time.conviteToken).toBe("token-123");
        expect(time.criadoEm).toBe(criadoEm);
    });

    it("deve usar defaults quando campos opcionais são omitidos", () => {
        const time = new Time({ nome: "Team Beta", donoId: "user-1" });

        expect(time.membroIds).toEqual([]);
        expect(time.solicitacoesPendentes).toEqual([]);
        expect(time.descricao).toBeUndefined();
        expect(time.imagemUrl).toBeUndefined();
        expect(time.conviteToken).toBeUndefined();
        expect(time.criadoEm).toBeInstanceOf(Date);
    });

    it("deve gerar id automaticamente se não informado", () => {
        const time = new Time({ nome: "Team", donoId: "user-1" });

        expect(time.id).toBeDefined();
        expect(time.id.length).toBeGreaterThan(0);
    });

    describe("criar", () => {
        it("deve criar time com factory method", () => {
            const time = Time.criar({ nome: "Team Factory", donoId: "user-1", descricao: "desc" });

            expect(time.nome).toBe("Team Factory");
            expect(time.descricao).toBe("desc");
            expect(time.id).toBeDefined();
        });

        it("deve gerar ids únicos", () => {
            const t1 = Time.criar({ nome: "A", donoId: "u" });
            const t2 = Time.criar({ nome: "B", donoId: "u" });
            expect(t1.id).not.toBe(t2.id);
        });
    });
});
