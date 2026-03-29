import { ExcluirTorneio } from "../../../src/casosDeUso/torneio/excluirTorneio";
import { criarMockTorneioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";

describe("ExcluirTorneio", () => {
    const torneioExistente = new Torneio({
        id: "torneio-1",
        nome: "Grand Prix SP",
        horario: new Date("2025-06-01T10:00:00Z"),
        formato: "modern",
        donoId: "user-1",
        status: "inscricoes_abertas",
        rodadaAtual: 0,
        totalRodadas: 0,
        emCorte: false,
    });

    it("deve excluir o torneio com sucesso", async () => {
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioExistente),
        });
        const uc = ExcluirTorneio.criar(gateway);

        const resultado = await uc.executar({
            id: "torneio-1",
            requisitanteId: "user-1",
            isAdmin: false,
        });

        expect(resultado.mensagem).toBe("Torneio excluído com sucesso.");
        expect(gateway.excluir).toHaveBeenCalledWith("torneio-1");
    });

    it("deve lançar 404 se torneio não existir", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = ExcluirTorneio.criar(gateway);

        await expect(
            uc.executar({ id: "inexistente", requisitanteId: "user-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 403 se não for dono nem admin", async () => {
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioExistente),
        });
        const uc = ExcluirTorneio.criar(gateway);

        await expect(
            uc.executar({ id: "torneio-1", requisitanteId: "outro-user", isAdmin: false })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode excluir torneio de outro usuário", async () => {
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioExistente),
        });
        const uc = ExcluirTorneio.criar(gateway);

        const resultado = await uc.executar({
            id: "torneio-1",
            requisitanteId: "admin-id",
            isAdmin: true,
        });

        expect(resultado.mensagem).toBe("Torneio excluído com sucesso.");
        expect(gateway.excluir).toHaveBeenCalledWith("torneio-1");
    });

    it("deve lançar erro se torneio já estiver em andamento", async () => {
        const torneioEmAndamento = new Torneio({
            ...torneioExistente,
            status: "em_andamento",
        });
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento),
        });
        const uc = ExcluirTorneio.criar(gateway);

        await expect(
            uc.executar({ id: "torneio-1", requisitanteId: "user-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });

        expect(gateway.excluir).not.toHaveBeenCalled();
    });

    it("deve lançar erro se torneio já estiver finalizado", async () => {
        const torneioFinalizado = new Torneio({
            ...torneioExistente,
            status: "finalizado",
        });
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioFinalizado),
        });
        const uc = ExcluirTorneio.criar(gateway);

        await expect(
            uc.executar({ id: "torneio-1", requisitanteId: "user-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });
});
