import { ExcluirTime } from "../../../src/casosDeUso/time/excluirTime";
import { criarMockTimeGateway } from "../../mocks/gateways";
import { Time } from "../../../src/dominio/entidade/time";

const timeExistente = new Time({
    id: "time-1",
    nome: "Team Alpha",
    donoId: "user-1",
    membroIds: ["user-1"],
    criadoEm: new Date(),
});

describe("ExcluirTime", () => {
    it("deve excluir pelo dono", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const uc = ExcluirTime.criar(timeGateway);

        const resultado = await uc.executar({ id: "time-1", requisitanteId: "user-1", isAdmin: false });

        expect(resultado.mensagem).toBeDefined();
        expect(timeGateway.excluir).toHaveBeenCalledWith("time-1");
    });

    it("deve excluir pelo admin", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const uc = ExcluirTime.criar(timeGateway);

        await expect(
            uc.executar({ id: "time-1", requisitanteId: "admin-1", isAdmin: true })
        ).resolves.toBeDefined();
    });

    it("deve lançar 403 se não for dono nem admin", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const uc = ExcluirTime.criar(timeGateway);

        await expect(
            uc.executar({ id: "time-1", requisitanteId: "user-2", isAdmin: false })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("deve lançar 404 se o time não existir", async () => {
        const timeGateway = criarMockTimeGateway();
        const uc = ExcluirTime.criar(timeGateway);

        await expect(
            uc.executar({ id: "nao-existe", requisitanteId: "user-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });
});
