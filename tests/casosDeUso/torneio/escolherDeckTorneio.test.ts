import { EscolherDeckTorneio } from "../../../src/casosDeUso/torneio/escolherDeckTorneio";
import {
    criarMockTorneioGateway,
    criarMockInscricaoGateway,
    criarMockDeckGateway,
    criarMockUsuarioGateway,
} from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { eventosTorneio } from "../../../src/infra/socketio/eventosTorneio";

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
        checkInRodada: -1, dropped: false,
    });

    const deck = new Deck({
        id: "deck-1", nome: "Burn", formato: "legacy",
        maindeck: [], sideboard: [], usuarioId: "u-1",
    });

    const usuario = new Usuario({
        id: "u-1", nome: "João", email: "j@e.com", senha: "s",
        nickMTGO: "joao_mtgo", nickArena: "joao#arena",
    });

    const criar = (
        torneioGw = criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
        inscricaoGw = criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue({ ...inscricao }) }),
        deckGw = criarMockDeckGateway({ buscarPorId: jest.fn().mockResolvedValue(deck) }),
        usuarioGw = criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
    ) => EscolherDeckTorneio.criar(torneioGw, inscricaoGw, deckGw, usuarioGw);

    beforeEach(() => {
        (eventosTorneio.emit as jest.Mock).mockClear();
    });

    it("deve escolher o deck com sucesso", async () => {
        const inscricaoGw = criarMockInscricaoGateway({
            buscarPorTorneioEUsuario: jest.fn().mockResolvedValue({ ...inscricao }),
        });
        const uc = criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            inscricaoGw,
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            requisitanteId: "u-1",
            usuarioId: "u-1",
            isAdmin: false,
            deckId: "deck-1",
        });

        expect(resultado.deckId).not.toBe("deck-1");
        expect(resultado.usuario).toEqual({ id: "u-1", nome: "João" });
        expect(inscricaoGw.atualizar).toHaveBeenCalledTimes(1);
        expect(inscricaoGw.atualizar).toHaveBeenCalledWith(expect.objectContaining({ deckId: resultado.deckId }));
        expect(eventosTorneio.emit).toHaveBeenCalledWith(
            "deck_inserido",
            expect.objectContaining({ usuarioId: "u-1", usuarioNome: "João", deckConfirmado: true }),
        );
    });

    it("emite deck_inserido com nick Arena quando o torneio usa nickArena", async () => {
        const torneioArena = new Torneio({
            ...torneio,
            exibirNomeJogador: "nickArena",
        });
        const uc = criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioArena) }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            requisitanteId: "u-1",
            usuarioId: "u-1",
            isAdmin: false,
            deckId: "deck-1",
        });

        expect(resultado.usuario.nome).toBe("joao#arena");
        expect(eventosTorneio.emit).toHaveBeenCalledWith(
            "deck_inserido",
            expect.objectContaining({ usuarioNome: "joao#arena" }),
        );
    });

    it("deve lançar erro se torneio não encontrado", async () => {
        const uc = criar(criarMockTorneioGateway(), criarMockInscricaoGateway(), criarMockDeckGateway());

        await expect(
            uc.executar({ torneioId: "x", requisitanteId: "u", usuarioId: "u", isAdmin: false, deckId: "d" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se torneio finalizado", async () => {
        const torneioFin = { ...torneio, status: "finalizado" as const };
        const uc = criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioFin) }),
            criarMockInscricaoGateway(),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", requisitanteId: "u", usuarioId: "u", isAdmin: false, deckId: "d" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se não estiver inscrito", async () => {
        const uc = criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway(),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", requisitanteId: "u-1", usuarioId: "u-1", isAdmin: false, deckId: "d" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se o deck não existir", async () => {
        const uc = criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao) }),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", requisitanteId: "u-1", usuarioId: "u-1", isAdmin: false, deckId: "inexistente" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se o deck pertencer a outro usuário e não for admin", async () => {
        const deckOutro = { ...deck, usuarioId: "outro" };
        const uc = criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao) }),
            criarMockDeckGateway({ buscarPorId: jest.fn().mockResolvedValue(deckOutro) }),
        );

        await expect(
            uc.executar({ torneioId: "t-1", requisitanteId: "u-1", usuarioId: "u-1", isAdmin: false, deckId: "deck-1" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode atribuir deck de outro usuário a uma inscrição", async () => {
        const deckOutro = { ...deck, usuarioId: "outro" };
        const inscricaoGw = criarMockInscricaoGateway({
            buscarPorTorneioEUsuario: jest.fn().mockResolvedValue({ ...inscricao }),
        });
        const uc = criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            inscricaoGw,
            criarMockDeckGateway({ buscarPorId: jest.fn().mockResolvedValue(deckOutro) }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            requisitanteId: "admin-id",
            usuarioId: "u-1",
            isAdmin: true,
            deckId: "deck-1",
        });

        expect(resultado.deckId).not.toBe("deck-1");
        expect(inscricaoGw.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se o formato do deck não corresponder ao do torneio", async () => {
        const deckModern = new Deck({
            id: "deck-2", nome: "Burn Modern", formato: "modern",
            maindeck: [], sideboard: [], usuarioId: "u-1",
        });
        const uc = criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao) }),
            criarMockDeckGateway({ buscarPorId: jest.fn().mockResolvedValue(deckModern) }),
        );

        await expect(
            uc.executar({
                torneioId: "t-1",
                requisitanteId: "u-1",
                usuarioId: "u-1",
                isAdmin: false,
                deckId: "deck-2",
            })
        ).rejects.toMatchObject({ status: 400 });
    });
});
