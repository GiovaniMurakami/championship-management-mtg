import { RejeitarSolicitacaoTime } from "../../../src/casosDeUso/time/rejeitarSolicitacaoTime";
import { criarMockTimeGateway } from "../../mocks/gateways";
import { Time } from "../../../src/dominio/entidade/time";

const timeBase = new Time({
    id: "time-1",
    nome: "Team Alpha",
    donoId: "dono-1",
    membroIds: ["dono-1"],
    solicitacoesPendentes: ["user-2"],
});

describe("RejeitarSolicitacaoTime", () => {
    it("deve rejeitar solicitação e remover da lista pendente", async () => {
        const time = new Time({ ...timeBase, solicitacoesPendentes: ["user-2"] });
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(time) });
        const uc = RejeitarSolicitacaoTime.criar(timeGateway);

        const resultado = await uc.executar({ timeId: "time-1", requisitanteId: "dono-1", usuarioId: "user-2" });

        expect(resultado.timeId).toBe("time-1");
        expect(resultado.mensagem).toBe("Solicitação rejeitada.");
        expect(time.solicitacoesPendentes).not.toContain("user-2");
        expect(timeGateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar 404 se o time não existir", async () => {
        const timeGateway = criarMockTimeGateway();
        const uc = RejeitarSolicitacaoTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "nao-existe", requisitanteId: "dono-1", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 403 se o requisitante não for o dono", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeBase) });
        const uc = RejeitarSolicitacaoTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "time-1", requisitanteId: "outro-user", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("deve lançar 404 se a solicitação não existir", async () => {
        const timeSemSolicitacao = new Time({ ...timeBase, solicitacoesPendentes: [] });
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeSemSolicitacao) });
        const uc = RejeitarSolicitacaoTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "time-1", requisitanteId: "dono-1", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 404 });
    });
});
