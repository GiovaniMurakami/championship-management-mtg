import { EscolherDeckTorneio } from "../../../src/casosDeUso/torneio/escolherDeckTorneio";
import { criarMockTorneioGateway, criarMockInscricaoGateway, criarMockDeckGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Deck } from "../../../src/dominio/entidade/deck";

jest.mock("../../../src/infra/socketio/eventosTorneio", () => ({
    eventosTorneio: { emit: jest.fn() },
}));

describe("EscolherDeckTorneio", () => {
    const torneio = new Torneio({
        id: "t-1", nome: "T", horario: new Date(), formato: "legacy",
        donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
    });

    const inscricao = new Inscricao({
        id: "i-1", torneioId: "t-1", usuarioId: "u-1",
        checkIn: false, checkInRodada: -1, dropped: false,
    });

    const deck = new Deck({
        id: "deck-1", nome: "Burn", formato: "legacy",
        maindeck: [], sideboard: [], usuarioId: "u-1",
    });

    it("deve escolher o deck com sucesso", async () => {
        const inscricaoGw = criarMockInscricaoGateway({
            buscarPorTorneioEUsuario: jest.fn().mockResolvedValue({ ...inscricao }),
        });
        const uc = EscolherDeckTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            inscricaoGw,
            criarMockDeckGateway({ buscarPorId: jest.fn().mockResolvedValue(deck) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", usuarioId: "u-1", usuarioNome: "João", isAdmin: false, deckId: "deck-1" });

        expect(resultado.deckId).toBe("deck-1");
        expect(resultado.usuario).toEqual({ id: "u-1", nome: "João" });
        expect(inscricaoGw.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se torneio não encontrado", async () => {
        const uc = EscolherDeckTorneio.criar(
            criarMockTorneioGateway(),
            criarMockInscricaoGateway(),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ torneioId: "x", usuarioId: "u", usuarioNome: "u", isAdmin: false, deckId: "d" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se torneio finalizado", async () => {
        const torneioFin = { ...torneio, status: "finalizado" as const };
        const uc = EscolherDeckTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioFin) }),
            criarMockInscricaoGateway(),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", usuarioId: "u", usuarioNome: "u", isAdmin: false, deckId: "d" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se não estiver inscrito", async () => {
        const uc = EscolherDeckTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway(),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", usuarioId: "u-1", usuarioNome: "João", isAdmin: false, deckId: "d" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se o deck não existir", async () => {
        const uc = EscolherDeckTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao) }),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", usuarioId: "u-1", usuarioNome: "João", isAdmin: false, deckId: "inexistente" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se o deck pertencer a outro usuário e não for admin", async () => {
        const deckOutro = { ...deck, usuarioId: "outro" };
        const uc = EscolherDeckTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao) }),
            criarMockDeckGateway({ buscarPorId: jest.fn().mockResolvedValue(deckOutro) }),
        );

        await expect(
            uc.executar({ torneioId: "t-1", usuarioId: "u-1", usuarioNome: "João", isAdmin: false, deckId: "deck-1" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode atribuir deck de outro usuário a uma inscrição", async () => {
        const deckOutro = { ...deck, usuarioId: "outro" };
        const inscricaoGw = criarMockInscricaoGateway({
            buscarPorTorneioEUsuario: jest.fn().mockResolvedValue({ ...inscricao }),
        });
        const uc = EscolherDeckTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            inscricaoGw,
            criarMockDeckGateway({ buscarPorId: jest.fn().mockResolvedValue(deckOutro) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", usuarioId: "u-1", usuarioNome: "Admin", isAdmin: true, deckId: "deck-1" });

        expect(resultado.deckId).toBe("deck-1");
        expect(inscricaoGw.atualizar).toHaveBeenCalledTimes(1);
    });
});
