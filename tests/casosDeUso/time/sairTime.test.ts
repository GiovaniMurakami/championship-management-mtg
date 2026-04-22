import { SairTime } from "../../../src/casosDeUso/time/sairTime";
import { criarMockTimeGateway } from "../../mocks/gateways";
import { Time } from "../../../src/dominio/entidade/time";

const timeComDoisMembros = new Time({
    id: "time-1",
    nome: "Team Alpha",
    donoId: "user-1",
    membroIds: ["user-1", "user-2"],
    criadoEm: new Date(),
});

describe("SairTime", () => {
    it("deve remover um membro não-dono do time", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeComDoisMembros) });
        const uc = SairTime.criar(timeGateway);

        const resultado = await uc.executar({ timeId: "time-1", usuarioId: "user-2" });

        expect(resultado.membroIds).not.toContain("user-2");
        expect(timeGateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar 400 se o dono tentar sair", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeComDoisMembros) });
        const uc = SairTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "time-1", usuarioId: "user-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se o usuário não for membro", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeComDoisMembros) });
        const uc = SairTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "time-1", usuarioId: "user-3" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 404 se o time não existir", async () => {
        const timeGateway = criarMockTimeGateway();
        const uc = SairTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "nao-existe", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 404 });
    });
});
