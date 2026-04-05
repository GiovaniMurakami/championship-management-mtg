import { ContestarResultado } from "../../../src/casosDeUso/torneio/contestarResultado";
import { criarMockPartidaGateway, criarMockTorneioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Partida } from "../../../src/dominio/entidade/partida";

describe("ContestarResultado", () => {
    const torneio = new Torneio({
        id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
        donoId: "dono-1", status: "em_andamento", rodadaAtual: 2, totalRodadas: 4,
    });

    const partida = new Partida({
        id: "p-1", torneioId: "t-1", rodada: 1,
        jogador1Id: "u-1", jogador2Id: "u-2",
        vitoriasJogador1: 2, vitoriasJogador2: 0,
        status: "finalizada",
    });

    it("deve marcar partida como contestada sem alterar o resultado", async () => {
        const partidaContestada = new Partida({ ...partida, contestado: true });

        const uc = ContestarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({
                buscarPorId: jest.fn().mockResolvedValue(partida),
                contestarPartida: jest.fn().mockResolvedValue(partidaContestada),
            }),
        );

        const resultado = await uc.executar({ partidaId: "p-1", usuarioId: "u-1", isAdmin: false });

        expect(resultado.contestado).toBe(true);
        expect(resultado.vitoriasJogador1).toBe(2);
        expect(resultado.vitoriasJogador2).toBe(0);
        expect(resultado.status).toBe("finalizada");
    });

    it("deve lançar 404 se a partida não existir", async () => {
        const uc = ContestarResultado.criar(
            criarMockTorneioGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ partidaId: "inexistente", usuarioId: "u-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 400 se a partida não estiver finalizada", async () => {
        const partidaPendente = new Partida({ ...partida, status: "pendente" });

        const uc = ContestarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaPendente) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", usuarioId: "u-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se o torneio não estiver em andamento", async () => {
        const torneioFinalizado = new Torneio({ ...torneio, status: "finalizado" });

        const uc = ContestarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioFinalizado) }),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partida) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", usuarioId: "u-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 403 se o usuário não for jogador, dono nem admin", async () => {
        const uc = ContestarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partida) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", usuarioId: "terceiro", isAdmin: false })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("o dono do torneio pode contestar a partida", async () => {
        const partidaContestada = new Partida({ ...partida, contestado: true });

        const uc = ContestarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({
                buscarPorId: jest.fn().mockResolvedValue(partida),
                contestarPartida: jest.fn().mockResolvedValue(partidaContestada),
            }),
        );

        const resultado = await uc.executar({ partidaId: "p-1", usuarioId: "dono-1", isAdmin: false });

        expect(resultado.contestado).toBe(true);
    });

    it("admin pode contestar a partida", async () => {
        const partidaContestada = new Partida({ ...partida, contestado: true });

        const uc = ContestarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({
                buscarPorId: jest.fn().mockResolvedValue(partida),
                contestarPartida: jest.fn().mockResolvedValue(partidaContestada),
            }),
        );

        const resultado = await uc.executar({ partidaId: "p-1", usuarioId: "qualquer-admin", isAdmin: true });

        expect(resultado.contestado).toBe(true);
    });

    it("jogador2 pode contestar a partida", async () => {
        const partidaContestada = new Partida({ ...partida, contestado: true });

        const uc = ContestarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({
                buscarPorId: jest.fn().mockResolvedValue(partida),
                contestarPartida: jest.fn().mockResolvedValue(partidaContestada),
            }),
        );

        const resultado = await uc.executar({ partidaId: "p-1", usuarioId: "u-2", isAdmin: false });

        expect(resultado.contestado).toBe(true);
    });
});
