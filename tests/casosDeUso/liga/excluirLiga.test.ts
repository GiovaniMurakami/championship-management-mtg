import { ExcluirLiga } from "../../../src/casosDeUso/liga/excluirLiga";
import { criarMockLigaGateway } from "../../mocks/gateways";
import { Liga } from "../../../src/dominio/entidade/liga";

describe("ExcluirLiga", () => {
    const ligaExistente = new Liga({
        id: "liga-1",
        nome: "Liga Nacional",
        donoId: "user-1",
        torneioIds: [],
    });

    it("deve excluir a liga com sucesso", async () => {
        const gateway = criarMockLigaGateway({
            buscarPorId: jest.fn().mockResolvedValue(ligaExistente),
        });
        const uc = ExcluirLiga.criar(gateway);

        const resultado = await uc.executar({
            id: "liga-1",
            requisitanteId: "user-1",
            isAdmin: false,
        });

        expect(resultado.mensagem).toBe("Liga excluída com sucesso.");
        expect(gateway.excluir).toHaveBeenCalledWith("liga-1");
    });

    it("deve lançar 404 se liga não existir", async () => {
        const gateway = criarMockLigaGateway();
        const uc = ExcluirLiga.criar(gateway);

        await expect(
            uc.executar({ id: "inexistente", requisitanteId: "user-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 403 se não for dono nem admin", async () => {
        const gateway = criarMockLigaGateway({
            buscarPorId: jest.fn().mockResolvedValue(ligaExistente),
        });
        const uc = ExcluirLiga.criar(gateway);

        await expect(
            uc.executar({ id: "liga-1", requisitanteId: "outro-user", isAdmin: false })
        ).rejects.toMatchObject({ status: 403 });

        expect(gateway.excluir).not.toHaveBeenCalled();
    });

    it("admin pode excluir liga de outro usuário", async () => {
        const gateway = criarMockLigaGateway({
            buscarPorId: jest.fn().mockResolvedValue(ligaExistente),
        });
        const uc = ExcluirLiga.criar(gateway);

        const resultado = await uc.executar({
            id: "liga-1",
            requisitanteId: "admin-id",
            isAdmin: true,
        });

        expect(resultado.mensagem).toBe("Liga excluída com sucesso.");
        expect(gateway.excluir).toHaveBeenCalledWith("liga-1");
    });
});
