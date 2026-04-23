import { GerarConviteTime } from "../../../src/casosDeUso/time/gerarConviteTime";
import { criarMockTimeGateway } from "../../mocks/gateways";
import { Time } from "../../../src/dominio/entidade/time";

const timeBase = new Time({ id: "time-1", nome: "Team Alpha", donoId: "dono-1", membroIds: ["dono-1"] });

describe("GerarConviteTime", () => {
    it("deve gerar um token de convite e salvar no time", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeBase) });
        const uc = GerarConviteTime.criar(timeGateway);

        const resultado = await uc.executar({ timeId: "time-1", requisitanteId: "dono-1" });

        expect(resultado.conviteToken).toBeDefined();
        expect(typeof resultado.conviteToken).toBe("string");
        expect(resultado.conviteToken.length).toBeGreaterThan(0);
        expect(timeGateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar 404 se o time não existir", async () => {
        const timeGateway = criarMockTimeGateway();
        const uc = GerarConviteTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "nao-existe", requisitanteId: "dono-1" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 403 se o requisitante não for o dono", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeBase) });
        const uc = GerarConviteTime.criar(timeGateway);

        await expect(
            uc.executar({ timeId: "time-1", requisitanteId: "outro-user" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("deve gerar tokens únicos a cada chamada", async () => {
        const time1 = new Time({ ...timeBase });
        const time2 = new Time({ ...timeBase });
        const gw1 = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(time1) });
        const gw2 = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(time2) });

        const r1 = await GerarConviteTime.criar(gw1).executar({ timeId: "time-1", requisitanteId: "dono-1" });
        const r2 = await GerarConviteTime.criar(gw2).executar({ timeId: "time-1", requisitanteId: "dono-1" });

        expect(r1.conviteToken).not.toBe(r2.conviteToken);
    });
});
