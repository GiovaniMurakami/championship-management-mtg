import { AlterarTime } from "../../../src/casosDeUso/time/alterarTime";
import { criarMockTimeGateway } from "../../mocks/gateways";
import { Time } from "../../../src/dominio/entidade/time";

const timeExistente = new Time({
    id: "time-1",
    nome: "Time Original",
    donoId: "user-1",
    membroIds: ["user-1"],
    criadoEm: new Date(),
});

describe("AlterarTime", () => {
    it("deve alterar nome pelo dono", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const uc = AlterarTime.criar(timeGateway);

        const resultado = await uc.executar({ id: "time-1", requisitanteId: "user-1", isAdmin: false, nome: "  Novo Nome  " });

        expect(resultado.nome).toBe("Novo Nome");
        expect(timeGateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve alterar pelo admin mesmo não sendo dono", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const uc = AlterarTime.criar(timeGateway);

        await expect(
            uc.executar({ id: "time-1", requisitanteId: "admin-1", isAdmin: true, nome: "Alterado" })
        ).resolves.toMatchObject({ nome: "Alterado" });
    });

    it("deve lançar 403 se não for dono nem admin", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const uc = AlterarTime.criar(timeGateway);

        await expect(
            uc.executar({ id: "time-1", requisitanteId: "user-2", isAdmin: false, nome: "Hack" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("deve lançar 404 se o time não existir", async () => {
        const timeGateway = criarMockTimeGateway();
        const uc = AlterarTime.criar(timeGateway);

        await expect(
            uc.executar({ id: "nao-existe", requisitanteId: "user-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });
});
