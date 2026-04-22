import { ConfirmarResultado } from "../../../src/casosDeUso/torneio/confirmarResultado";
import { criarMockTorneioGateway, criarMockPartidaGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Partida } from "../../../src/dominio/entidade/partida";

describe("ConfirmarResultado", () => {
    const torneio = new Torneio({
        id: "torneio-1",
        nome: "Torneio Teste",
        horario: new Date(),
        formato: "modern",
        donoId: "admin-1",
        status: "em_andamento",
        rodadaAtual: 1,
        totalRodadas: 3,
    });

    const partida = new Partida({
        id: "partida-1",
        torneioId: "torneio-1",
        rodada: 1,
        jogador1Id: "user-1",
        jogador2Id: "user-2",
        vitoriasJogador1: 2,
        vitoriasJogador2: 0,
        status: "finalizada",
        confirmadoPor: [],
    });

    it("deve lançar 404 se partida não existir", async () => {
        const uc = ConfirmarResultado.criar(
            criarMockTorneioGateway(),
            criarMockPartidaGateway()
        );
        await expect(uc.executar({ partidaId: "inexistente", usuarioId: "user-1" }))
            .rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 400 se partida não estiver finalizada", async () => {
        const partidaPendente = new Partida({ ...partida, status: "pendente" });
        const uc = ConfirmarResultado.criar(
            criarMockTorneioGateway(),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaPendente) })
        );
        await expect(uc.executar({ partidaId: "partida-1", usuarioId: "user-1" }))
            .rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se partida for bye", async () => {
        const partidaBye = new Partida({ ...partida, jogador2Id: null, vitoriasJogador1: 2 });
        const uc = ConfirmarResultado.criar(
            criarMockTorneioGateway(),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaBye) })
        );
        await expect(uc.executar({ partidaId: "partida-1", usuarioId: "user-1" }))
            .rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 403 se usuário não for jogador da partida", async () => {
        const uc = ConfirmarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partida) })
        );
        await expect(uc.executar({ partidaId: "partida-1", usuarioId: "intruso" }))
            .rejects.toMatchObject({ status: 403 });
    });

    it("deve lançar 400 se torneio não estiver em andamento", async () => {
        const torneioFinalizado = new Torneio({ ...torneio, status: "finalizado" });
        const uc = ConfirmarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioFinalizado) }),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partida) })
        );
        await expect(uc.executar({ partidaId: "partida-1", usuarioId: "user-1" }))
            .rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se jogador já confirmou", async () => {
        const uc = ConfirmarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({
                buscarPorId: jest.fn().mockResolvedValue(partida),
                confirmarResultado: jest.fn().mockResolvedValue(null),
            })
        );
        await expect(uc.executar({ partidaId: "partida-1", usuarioId: "user-1" }))
            .rejects.toMatchObject({ status: 400 });
    });

    it("deve confirmar resultado com sucesso", async () => {
        const partidaConfirmada = new Partida({ ...partida, confirmadoPor: ["user-1"] });
        const uc = ConfirmarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({
                buscarPorId: jest.fn().mockResolvedValue(partida),
                confirmarResultado: jest.fn().mockResolvedValue(partidaConfirmada),
            })
        );
        const resultado = await uc.executar({ partidaId: "partida-1", usuarioId: "user-1" });
        expect(resultado.confirmadoPor).toContain("user-1");
        expect(resultado.id).toBe("partida-1");
    });
});
