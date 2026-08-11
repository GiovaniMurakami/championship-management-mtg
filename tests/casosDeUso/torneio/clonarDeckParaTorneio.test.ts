import { clonarDeckParaTorneio } from "../../../src/casosDeUso/torneio/clonarDeckParaTorneio";
import { Deck } from "../../../src/dominio/entidade/deck";

describe("clonarDeckParaTorneio", () => {
    it("cria cópia travada/oculta com torneioId e deckOriginalId", () => {
        const original = Deck.criar({
            nome: "Mono Red",
            nomeConsolidado: "Mono Red Aggro",
            formato: "Pauper",
            linkLigaMagic: "https://ligamagic.com/deck",
            maindeck: [{ nome: "Mountain", quantidade: 20 }, { nome: "Goblin", quantidade: 40 }],
            sideboard: [{ nome: "Pyroblast", quantidade: 3 }],
            commander: [],
            usuarioId: "u-1",
            oculto: false,
            travado: false,
        });

        const clone = clonarDeckParaTorneio(original, "torneio-1");

        expect(clone.id).not.toBe(original.id);
        expect(clone.nome).toBe("Mono Red");
        expect(clone.nomeConsolidado).toBe("Mono Red Aggro");
        expect(clone.formato).toBe("Pauper");
        expect(clone.linkLigaMagic).toBe("https://ligamagic.com/deck");
        expect(clone.usuarioId).toBe("u-1");
        expect(clone.oculto).toBe(true);
        expect(clone.travado).toBe(true);
        expect(clone.torneioId).toBe("torneio-1");
        expect(clone.deckOriginalId).toBe(original.id);
        expect(clone.maindeck).toEqual(original.maindeck);
        expect(clone.sideboard).toEqual(original.sideboard);
        expect(clone.maindeck).not.toBe(original.maindeck);
        expect(clone.sideboard).not.toBe(original.sideboard);
    });

    it("preserva commander clonando cartas", () => {
        const original = Deck.criar({
            nome: "EDH",
            formato: "Commander",
            maindeck: [{ nome: "Sol Ring", quantidade: 1 }],
            sideboard: [],
            commander: [{ nome: "Atraxa", quantidade: 1 }],
            usuarioId: "u-2",
        });

        const clone = clonarDeckParaTorneio(original, "t-2");
        expect(clone.commander).toEqual([{ nome: "Atraxa", quantidade: 1 }]);
        expect(clone.commander).not.toBe(original.commander);
    });
});
