import { CadastrarDeck } from "../../../src/casosDeUso/deck/cadastrarDeck";
import { criarMockDeckGateway } from "../../mocks/gateways";
import { Carta } from "../../../src/dominio/entidade/deck";

describe("CadastrarDeck", () => {
    const maindeckValido: Carta[] = [
        { nome: "Lightning Bolt", quantidade: 4 },
        { nome: "Mountain", quantidade: 56 },
    ];

    const sideboardValido: Carta[] = [
        { nome: "Red Elemental Blast", quantidade: 4 },
    ];

    it("deve cadastrar um deck com sucesso", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

        const resultado = await uc.executar({
            nome: "Burn",
            formato: "Legacy",
            maindeck: maindeckValido,
            sideboard: sideboardValido,
            usuarioId: "user-1",
        });

        expect(resultado.id).toBeDefined();
        expect(resultado.nome).toBe("Burn");
        expect(resultado.formato).toBe("legacy");
        expect(resultado.maindeck[0].nome).toBe("lightning bolt");
        expect(gateway.salvar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se o maindeck tiver menos de 60 cartas", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

        await expect(
            uc.executar({
                nome: "Deck pequeno",
                formato: "standard",
                maindeck: [{ nome: "carta", quantidade: 10 }],
                sideboard: [],
                usuarioId: "user-1",
            })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se o sideboard tiver mais de 15 cartas", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

        await expect(
            uc.executar({
                nome: "Deck",
                formato: "standard",
                maindeck: maindeckValido,
                sideboard: [{ nome: "carta", quantidade: 16 }],
                usuarioId: "user-1",
            })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve normalizar nomes de cartas para minúsculas", async () => {
        const gateway = criarMockDeckGateway();
        const uc = CadastrarDeck.criar(gateway);

        const resultado = await uc.executar({
            nome: "Test",
            formato: "modern",
            maindeck: [{ nome: "  Lightning BOLT  ", quantidade: 60 }],
            sideboard: [{ nome: "  SIDEBOARD Card ", quantidade: 1 }],
            usuarioId: "u",
        });

        expect(resultado.maindeck[0].nome).toBe("lightning bolt");
        expect(resultado.sideboard[0].nome).toBe("sideboard card");
    });
});
