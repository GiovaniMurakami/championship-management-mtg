import { CriarTime } from "../../../src/casosDeUso/time/criarTime";
import { criarMockTimeGateway } from "../../mocks/gateways";

describe("CriarTime", () => {
    it("deve criar um time e adicionar o dono como membro", async () => {
        const timeGateway = criarMockTimeGateway();
        const uc = CriarTime.criar(timeGateway);

        const resultado = await uc.executar({
            nome: "  Meu Time  ",
            donoId: "user-1",
        });

        expect(resultado.nome).toBe("Meu Time");
        expect(resultado.donoId).toBe("user-1");
        expect(resultado.membroIds).toContain("user-1");
        expect(resultado.id).toBeDefined();
        expect(timeGateway.salvar).toHaveBeenCalledTimes(1);
    });

    it("deve criar um time com descrição", async () => {
        const timeGateway = criarMockTimeGateway();
        const uc = CriarTime.criar(timeGateway);

        const resultado = await uc.executar({
            nome: "Time Alpha",
            descricao: "  Melhor time  ",
            donoId: "user-1",
        });

        expect(resultado.descricao).toBe("Melhor time");
    });
});
