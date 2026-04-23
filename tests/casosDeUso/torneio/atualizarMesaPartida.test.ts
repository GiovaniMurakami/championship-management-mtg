import { AtualizarMesaPartida } from "../../../src/casosDeUso/torneio/atualizarMesaPartida";
import { criarMockTorneioGateway, criarMockPartidaGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Partida } from "../../../src/dominio/entidade/partida";

const torneioEmAndamento = new Torneio({
    id: "t-1",
    nome: "Torneio",
    horario: new Date(),
    formato: "modern",
    donoId: "dono-1",
    status: "em_andamento",
    rodadaAtual: 1,
    totalRodadas: 3,
});

const partidaBase = new Partida({
    id: "p-1",
    torneioId: "t-1",
    rodada: 1,
    jogador1Id: "user-1",
    jogador2Id: "user-2",
    mesa: null,
});

describe("AtualizarMesaPartida", () => {
    it("deve atualizar a mesa da partida (dono do torneio)", async () => {
        const partidaAtualizada = new Partida({ ...partidaBase, mesa: 3 });
        const torneioGateway = criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento) });
        const partidaGateway = criarMockPartidaGateway({
            buscarPorId: jest.fn().mockResolvedValue(partidaBase),
            atualizarMesa: jest.fn().mockResolvedValue(partidaAtualizada),
        });
        const uc = AtualizarMesaPartida.criar(torneioGateway, partidaGateway);

        const resultado = await uc.executar({ partidaId: "p-1", mesa: 3, requisitanteId: "dono-1", isAdmin: false });

        expect(resultado.mesa).toBe(3);
        expect(resultado.id).toBe("p-1");
        expect(partidaGateway.atualizarMesa).toHaveBeenCalledWith("p-1", 3);
    });

    it("deve atualizar mesa como null (remover mesa)", async () => {
        const partidaAtualizada = new Partida({ ...partidaBase, mesa: null });
        const torneioGateway = criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento) });
        const partidaGateway = criarMockPartidaGateway({
            buscarPorId: jest.fn().mockResolvedValue(partidaBase),
            atualizarMesa: jest.fn().mockResolvedValue(partidaAtualizada),
        });
        const uc = AtualizarMesaPartida.criar(torneioGateway, partidaGateway);

        const resultado = await uc.executar({ partidaId: "p-1", mesa: null, requisitanteId: "dono-1", isAdmin: false });

        expect(resultado.mesa).toBeNull();
    });

    it("deve permitir admin de outro torneio alterar mesa", async () => {
        const partidaAtualizada = new Partida({ ...partidaBase, mesa: 5 });
        const torneioGateway = criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento) });
        const partidaGateway = criarMockPartidaGateway({
            buscarPorId: jest.fn().mockResolvedValue(partidaBase),
            atualizarMesa: jest.fn().mockResolvedValue(partidaAtualizada),
        });
        const uc = AtualizarMesaPartida.criar(torneioGateway, partidaGateway);

        const resultado = await uc.executar({ partidaId: "p-1", mesa: 5, requisitanteId: "outro-user", isAdmin: true });

        expect(resultado.mesa).toBe(5);
    });

    it("deve lançar 404 se a partida não existir", async () => {
        const torneioGateway = criarMockTorneioGateway();
        const partidaGateway = criarMockPartidaGateway();
        const uc = AtualizarMesaPartida.criar(torneioGateway, partidaGateway);

        await expect(
            uc.executar({ partidaId: "nao-existe", mesa: 1, requisitanteId: "dono-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 404 se o torneio não existir", async () => {
        const torneioGateway = criarMockTorneioGateway();
        const partidaGateway = criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaBase) });
        const uc = AtualizarMesaPartida.criar(torneioGateway, partidaGateway);

        await expect(
            uc.executar({ partidaId: "p-1", mesa: 1, requisitanteId: "dono-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 400 se o torneio não estiver em andamento", async () => {
        const torneioInscricoes = new Torneio({ ...torneioEmAndamento, status: "inscricoes_abertas" });
        const torneioGateway = criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioInscricoes) });
        const partidaGateway = criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaBase) });
        const uc = AtualizarMesaPartida.criar(torneioGateway, partidaGateway);

        await expect(
            uc.executar({ partidaId: "p-1", mesa: 1, requisitanteId: "dono-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 403 se não for dono nem admin", async () => {
        const torneioGateway = criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento) });
        const partidaGateway = criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaBase) });
        const uc = AtualizarMesaPartida.criar(torneioGateway, partidaGateway);

        await expect(
            uc.executar({ partidaId: "p-1", mesa: 1, requisitanteId: "outro-user", isAdmin: false })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("deve lançar 400 se a mesa for menor que 1", async () => {
        const torneioGateway = criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento) });
        const partidaGateway = criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaBase) });
        const uc = AtualizarMesaPartida.criar(torneioGateway, partidaGateway);

        await expect(
            uc.executar({ partidaId: "p-1", mesa: 0, requisitanteId: "dono-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se atualizarMesa retornar null", async () => {
        const torneioGateway = criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento) });
        const partidaGateway = criarMockPartidaGateway({
            buscarPorId: jest.fn().mockResolvedValue(partidaBase),
            atualizarMesa: jest.fn().mockResolvedValue(null),
        });
        const uc = AtualizarMesaPartida.criar(torneioGateway, partidaGateway);

        await expect(
            uc.executar({ partidaId: "p-1", mesa: 2, requisitanteId: "dono-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });
});
