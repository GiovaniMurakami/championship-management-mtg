import { RegistrarResultado } from "../../../src/casosDeUso/torneio/registrarResultado";
import { criarMockTorneioGateway, criarMockPartidaGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Partida } from "../../../src/dominio/entidade/partida";

describe("RegistrarResultado", () => {
    const torneio = new Torneio({
        id: "t-1", nome: "T", horario: new Date(), formato: "f",
        donoId: "dono", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
    });

    const partida = new Partida({
        id: "p-1", torneioId: "t-1", rodada: 1,
        jogador1Id: "j1", jogador2Id: "j2",
        vitoriasJogador1: 0, vitoriasJogador2: 0,
        status: "pendente",
    });

    it("deve registrar resultado 2-1 com sucesso pelo jogador 1", async () => {
        const partidaGw = criarMockPartidaGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...partida }),
        });
        const uc = RegistrarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            partidaGw,
        );

        const resultado = await uc.executar({
            partidaId: "p-1", usuarioId: "j1", isAdmin: false,
            vitoriasJogador1: 2, vitoriasJogador2: 1,
        });

        expect(resultado.vitoriasJogador1).toBe(2);
        expect(resultado.vitoriasJogador2).toBe(1);
        expect(resultado.status).toBe("finalizada");
        expect(partidaGw.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve permitir registro pelo dono do torneio", async () => {
        const partidaGw = criarMockPartidaGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...partida }),
        });
        const uc = RegistrarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            partidaGw,
        );

        const resultado = await uc.executar({
            partidaId: "p-1", usuarioId: "dono", isAdmin: false,
            vitoriasJogador1: 2, vitoriasJogador2: 0,
        });

        expect(resultado.status).toBe("finalizada");
    });

    it("deve lançar erro se o usuário não for jogador, nem dono, nem admin", async () => {
        const uc = RegistrarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue({ ...partida }) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", usuarioId: "intruso", isAdmin: false, vitoriasJogador1: 2, vitoriasJogador2: 0 })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode registrar resultado de qualquer partida", async () => {
        const partidaGw = criarMockPartidaGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...partida }),
        });
        const uc = RegistrarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            partidaGw,
        );

        const resultado = await uc.executar({
            partidaId: "p-1", usuarioId: "admin-id", isAdmin: true,
            vitoriasJogador1: 2, vitoriasJogador2: 1,
        });

        expect(resultado.status).toBe("finalizada");
        expect(partidaGw.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se a partida não for encontrada", async () => {
        const uc = RegistrarResultado.criar(
            criarMockTorneioGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ partidaId: "x", usuarioId: "j", isAdmin: false, vitoriasJogador1: 0, vitoriasJogador2: 0 })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se a partida já estiver finalizada", async () => {
        const partidaFinalizada = { ...partida, status: "finalizada" as const };
        const uc = RegistrarResultado.criar(
            criarMockTorneioGateway(),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaFinalizada) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", usuarioId: "j1", isAdmin: false, vitoriasJogador1: 2, vitoriasJogador2: 0 })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro para resultado inválido (v1 > 2)", async () => {
        const uc = RegistrarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue({ ...partida }) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", usuarioId: "j1", isAdmin: false, vitoriasJogador1: 3, vitoriasJogador2: 0 })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro para resultado inválido (total > 3)", async () => {
        const uc = RegistrarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue({ ...partida }) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", usuarioId: "j1", isAdmin: false, vitoriasJogador1: 2, vitoriasJogador2: 2 })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro para resultado com valor negativo", async () => {
        const uc = RegistrarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue({ ...partida }) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", usuarioId: "j1", isAdmin: false, vitoriasJogador1: -1, vitoriasJogador2: 0 })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve aceitar resultado 0-0 (empate)", async () => {
        const partidaGw = criarMockPartidaGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...partida }),
        });
        const uc = RegistrarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            partidaGw,
        );

        const resultado = await uc.executar({
            partidaId: "p-1", usuarioId: "j1", isAdmin: false, vitoriasJogador1: 0, vitoriasJogador2: 0,
        });

        expect(resultado.vitoriasJogador1).toBe(0);
        expect(resultado.vitoriasJogador2).toBe(0);
        expect(resultado.status).toBe("finalizada");
    });
});
