import { ListarTimes } from "../../../src/casosDeUso/time/listarTimes";
import { Time } from "../../../src/dominio/entidade/time";
import { criarMockTimeGateway } from "../../mocks/gateways";

describe("ListarTimes", () => {
    it("deve listar times com paginação padrão", async () => {
        const criadoEm = new Date("2026-04-01T10:00:00.000Z");
        const time = new Time({
            id: "time-1",
            nome: "Team Alpha",
            descricao: "Time competitivo",
            imagemUrl: "https://example.com/time.png",
            donoId: "user-1",
            membroIds: ["user-1", "user-2"],
            criadoEm,
        });
        const listarMock = jest.fn().mockResolvedValue([time]);
        const listarTotalMock = jest.fn().mockResolvedValue(1);
        const gateway = criarMockTimeGateway({
            listar: listarMock,
            listarTotal: listarTotalMock,
        });
        const uc = ListarTimes.criar(gateway);

        const resultado = await uc.executar({});

        expect(listarMock).toHaveBeenCalledWith({ limite: 20, offset: 0, nome: undefined });
        expect(listarTotalMock).toHaveBeenCalledWith({ nome: undefined });
        expect(resultado.times).toEqual([{
            id: "time-1",
            nome: "Team Alpha",
            descricao: "Time competitivo",
            imagemUrl: "https://example.com/time.png",
            donoId: "user-1",
            membroIds: ["user-1", "user-2"],
            criadoEm,
        }]);
        expect(resultado.total).toBe(1);
        expect(resultado.limite).toBe(20);
        expect(resultado.offset).toBe(0);
    });

    it("deve limitar limite máximo, normalizar offset negativo e repassar filtro por nome", async () => {
        const listarMock = jest.fn().mockResolvedValue([]);
        const listarTotalMock = jest.fn().mockResolvedValue(0);
        const gateway = criarMockTimeGateway({
            listar: listarMock,
            listarTotal: listarTotalMock,
        });
        const uc = ListarTimes.criar(gateway);

        const resultado = await uc.executar({ limite: 150, offset: -10, nome: "Alpha" });

        expect(listarMock).toHaveBeenCalledWith({ limite: 100, offset: 0, nome: "Alpha" });
        expect(listarTotalMock).toHaveBeenCalledWith({ nome: "Alpha" });
        expect(resultado.limite).toBe(100);
        expect(resultado.offset).toBe(0);
    });

    it("deve usar limite e offset informados quando válidos", async () => {
        const listarMock = jest.fn().mockResolvedValue([]);
        const gateway = criarMockTimeGateway({ listar: listarMock });
        const uc = ListarTimes.criar(gateway);

        const resultado = await uc.executar({ limite: 5, offset: 10 });

        expect(listarMock).toHaveBeenCalledWith({ limite: 5, offset: 10, nome: undefined });
        expect(resultado.limite).toBe(5);
        expect(resultado.offset).toBe(10);
    });
});
