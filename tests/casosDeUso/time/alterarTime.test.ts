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

    it("deve alterar pelo admin mesmo nao sendo dono", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const uc = AlterarTime.criar(timeGateway);

        await expect(
            uc.executar({ id: "time-1", requisitanteId: "admin-1", isAdmin: true, nome: "Alterado" })
        ).resolves.toMatchObject({ nome: "Alterado" });
    });

    it("deve lancar 403 se nao for dono nem admin", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const uc = AlterarTime.criar(timeGateway);

        await expect(
            uc.executar({ id: "time-1", requisitanteId: "user-2", isAdmin: false, nome: "Hack" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("deve lancar 404 se o time nao existir", async () => {
        const timeGateway = criarMockTimeGateway();
        const uc = AlterarTime.criar(timeGateway);

        await expect(
            uc.executar({ id: "nao-existe", requisitanteId: "user-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve alterar descricao e imagemUrl quando informadas", async () => {
        const time = new Time({
            id: "time-1",
            nome: "Time Original",
            descricao: "Antiga",
            imagemUrl: "https://example.com/old.png",
            donoId: "user-1",
            membroIds: ["user-1"],
            criadoEm: new Date(),
        });
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(time) });
        const uc = AlterarTime.criar(timeGateway);

        const resultado = await uc.executar({
            id: "time-1",
            requisitanteId: "user-1",
            isAdmin: false,
            descricao: "  Nova descricao  ",
            imagemUrl: "https://example.com/new.png",
        });

        expect(resultado.nome).toBe("Time Original");
        expect(resultado.descricao).toBe("Nova descricao");
        expect(resultado.imagemUrl).toBe("https://example.com/new.png");
    });

    it("deve permitir limpar descricao com string vazia", async () => {
        const time = new Time({
            id: "time-1",
            nome: "Time Original",
            descricao: "Antiga",
            donoId: "user-1",
            membroIds: ["user-1"],
            criadoEm: new Date(),
        });
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(time) });
        const uc = AlterarTime.criar(timeGateway);

        const resultado = await uc.executar({
            id: "time-1",
            requisitanteId: "user-1",
            isAdmin: false,
            descricao: "   ",
        });

        expect(resultado.descricao).toBe("");
    });
});
