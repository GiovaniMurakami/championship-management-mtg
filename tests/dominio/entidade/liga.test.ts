import { Liga } from "../../../src/dominio/entidade/liga";

describe("Liga", () => {
    it("deve criar uma instância com todos os campos", () => {
        const criadoEm = new Date("2025-01-01");
        const liga = new Liga({
            id: "liga-1",
            nome: "Liga Standard",
            descricao: "Temporada 2025",
            donoId: "user-1",
            torneioIds: ["t-1", "t-2"],
            tipo: "times",
            criadoEm,
        });

        expect(liga.id).toBe("liga-1");
        expect(liga.nome).toBe("Liga Standard");
        expect(liga.descricao).toBe("Temporada 2025");
        expect(liga.donoId).toBe("user-1");
        expect(liga.torneioIds).toEqual(["t-1", "t-2"]);
        expect(liga.tipo).toBe("times");
        expect(liga.criadoEm).toBe(criadoEm);
    });

    it("deve usar defaults quando campos opcionais são omitidos", () => {
        const liga = new Liga({ nome: "Liga Simples", donoId: "user-1" });

        expect(liga.torneioIds).toEqual([]);
        expect(liga.tipo).toBe("individual");
        expect(liga.descricao).toBeUndefined();
        expect(liga.criadoEm).toBeInstanceOf(Date);
    });

    it("deve gerar id automaticamente se não informado", () => {
        const liga = new Liga({ nome: "Liga", donoId: "user-1" });

        expect(liga.id).toBeDefined();
        expect(liga.id.length).toBeGreaterThan(0);
    });

    describe("criar", () => {
        it("deve criar liga com factory method", () => {
            const liga = Liga.criar({ nome: "Liga Factory", donoId: "user-1", tipo: "times" });

            expect(liga.nome).toBe("Liga Factory");
            expect(liga.tipo).toBe("times");
            expect(liga.id).toBeDefined();
        });

        it("deve gerar ids únicos", () => {
            const l1 = Liga.criar({ nome: "A", donoId: "u" });
            const l2 = Liga.criar({ nome: "B", donoId: "u" });
            expect(l1.id).not.toBe(l2.id);
        });
    });
});
