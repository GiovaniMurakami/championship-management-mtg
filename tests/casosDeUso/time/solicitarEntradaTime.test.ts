import { SolicitarEntradaTime } from "../../../src/casosDeUso/time/solicitarEntradaTime";
import { criarMockTimeGateway } from "../../mocks/gateways";
import { Time } from "../../../src/dominio/entidade/time";

const timeBase = new Time({
    id: "time-1",
    nome: "Team Alpha",
    donoId: "dono-1",
    membroIds: ["dono-1"],
    solicitacoesPendentes: [],
});

describe("SolicitarEntradaTime", () => {
    it("deve adicionar solicitação na lista pendente", async () => {
        const time = new Time({ ...timeBase, solicitacoesPendentes: [] });
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(time) });
        const uc = SolicitarEntradaTime.criar(timeGateway);

        const resultado = await uc.executar({ timeId: "time-1", usuarioId: "user-2" });

        expect(resultado.timeId).toBe("time-1");
        expect(resultado.mensagem).toContain("Solicitação enviada");
        expect(time.solicitacoesPendentes).toContain("user-2");
        expect(timeGateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar 404 se o time não existir", async () => {
        const timeGateway = criarMockTimeGateway();
        const uc = SolicitarEntradaTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "nao-existe", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 400 se o usuário já for membro do time", async () => {
        const timeComMembro = new Time({ ...timeBase, membroIds: ["dono-1", "user-2"] });
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeComMembro) });
        const uc = SolicitarEntradaTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "time-1", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se o usuário já fizer parte de outro time", async () => {
        const outroTime = new Time({ id: "time-99", nome: "Outro", donoId: "user-2", membroIds: ["user-2"] });
        const timeGateway = criarMockTimeGateway({
            buscarPorId: jest.fn().mockResolvedValue(timeBase),
            buscarPorMembros: jest.fn().mockResolvedValue([outroTime]),
        });
        const uc = SolicitarEntradaTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "time-1", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se já houver solicitação pendente do usuário", async () => {
        const timeComPendente = new Time({ ...timeBase, solicitacoesPendentes: ["user-2"] });
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeComPendente) });
        const uc = SolicitarEntradaTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "time-1", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 400 });
    });
});
