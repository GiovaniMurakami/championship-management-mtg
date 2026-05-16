import { Deck, Carta } from "../../../src/dominio/entidade/deck";

describe("Deck", () => {
    const maindeck: Carta[] = [
        { nome: "Lightning Bolt", quantidade: 4 },
        { nome: "Mountain", quantidade: 56 },
    ];
    const sideboard: Carta[] = [{ nome: "Red Elemental Blast", quantidade: 3 }];
    const commander: Carta[] = [{ nome: "Atraxa, Praetors' Voice", quantidade: 1 }];

    it("deve criar uma instancia com todos os campos", () => {
        const deck = new Deck({
            id: "deck-1",
            nome: "Burn",
            formato: "legacy",
            linkLigaMagic: "https://www.ligamagic.com.br/?view=dks/deck&id=123456",
            maindeck,
            sideboard,
            commander,
            usuarioId: "user-1",
            criadoEm: new Date("2025-06-01"),
        });

        expect(deck.id).toBe("deck-1");
        expect(deck.nome).toBe("Burn");
        expect(deck.formato).toBe("legacy");
        expect(deck.linkLigaMagic).toBe("https://www.ligamagic.com.br/?view=dks/deck&id=123456");
        expect(deck.maindeck).toEqual(maindeck);
        expect(deck.sideboard).toEqual(sideboard);
        expect(deck.commander).toEqual(commander);
        expect(deck.usuarioId).toBe("user-1");
        expect(deck.criadoEm).toEqual(new Date("2025-06-01"));
    });

    it("deve definir commander vazio automaticamente quando nao informado", () => {
        const deck = new Deck({
            id: "deck-1",
            nome: "Burn",
            formato: "legacy",
            maindeck,
            sideboard,
            usuarioId: "user-1",
        });

        expect(deck.commander).toEqual([]);
    });

    it("deve definir linkLigaMagic como null automaticamente quando nao informado", () => {
        const deck = new Deck({
            id: "deck-1",
            nome: "Burn",
            formato: "legacy",
            maindeck,
            sideboard,
            usuarioId: "user-1",
        });

        expect(deck.linkLigaMagic).toBeNull();
    });

    it("deve definir criadoEm automaticamente quando nao informado", () => {
        const antes = new Date();
        const deck = new Deck({
            id: "deck-1",
            nome: "Burn",
            formato: "legacy",
            maindeck,
            sideboard,
            usuarioId: "user-1",
        });
        const depois = new Date();

        expect(deck.criadoEm.getTime()).toBeGreaterThanOrEqual(antes.getTime());
        expect(deck.criadoEm.getTime()).toBeLessThanOrEqual(depois.getTime());
    });

    describe("criar", () => {
        it("deve gerar id e criadoEm automaticamente", () => {
            const deck = Deck.criar({
                nome: "Mono Red",
                formato: "standard",
                linkLigaMagic: "https://www.ligamagic.com.br/?view=dks/deck&id=123456",
                maindeck,
                sideboard,
                commander,
                usuarioId: "user-2",
            });

            expect(deck.id).toBeDefined();
            expect(deck.id.length).toBeGreaterThan(0);
            expect(deck.nome).toBe("Mono Red");
            expect(deck.formato).toBe("standard");
            expect(deck.linkLigaMagic).toBe("https://www.ligamagic.com.br/?view=dks/deck&id=123456");
            expect(deck.commander).toEqual(commander);
            expect(deck.criadoEm).toBeInstanceOf(Date);
        });

        it("deve gerar ids unicos", () => {
            const d1 = Deck.criar({ nome: "A", formato: "f", maindeck: [], sideboard: [], usuarioId: "u" });
            const d2 = Deck.criar({ nome: "B", formato: "f", maindeck: [], sideboard: [], usuarioId: "u" });
            expect(d1.id).not.toBe(d2.id);
        });
    });
});
