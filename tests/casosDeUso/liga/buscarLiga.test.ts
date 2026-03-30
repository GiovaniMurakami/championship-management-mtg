import { BuscarLiga } from "../../../src/casosDeUso/liga/buscarLiga";
import { criarMockLigaGateway, criarMockTorneioGateway } from "../../mocks/gateways";
import { Liga } from "../../../src/dominio/entidade/liga";
import { Torneio } from "../../../src/dominio/entidade/torneio";

describe("BuscarLiga", () => {
    const torneio1 = new Torneio({
        id: "torneio-1",
        nome: "GP SP",
        horario: new Date("2025-06-01T10:00:00Z"),
        formato: "modern",
        donoId: "user-1",
        status: "finalizado",
        rodadaAtual: 5,
        totalRodadas: 5,
        emCorte: false,
    });

    const torneio2 = new Torneio({
        id: "torneio-2",
        nome: "GP RJ",
        horario: new Date("2025-07-01T10:00:00Z"),
        formato: "legacy",
        donoId: "user-1",
        status: "inscricoes_abertas",
        rodadaAtual: 0,
        totalRodadas: 0,
        emCorte: false,
    });

    it("deve retornar a liga com torneios expandidos", async () => {
        const liga = new Liga({
            id: "liga-1",
            nome: "Liga Nacional",
            donoId: "user-1",
            torneioIds: ["torneio-1", "torneio-2"],
        });
        const ligaGateway = criarMockLigaGateway({
            buscarPorId: jest.fn().mockResolvedValue(liga),
        });
        const torneioGateway = criarMockTorneioGateway({
            buscarPorId: jest.fn()
                .mockResolvedValueOnce(torneio1)
                .mockResolvedValueOnce(torneio2),
        });
        const uc = BuscarLiga.criar(ligaGateway, torneioGateway);

        const resultado = await uc.executar({ id: "liga-1" });

        expect(resultado.id).toBe("liga-1");
        expect(resultado.torneios).toHaveLength(2);
        expect(resultado.torneios[0].id).toBe("torneio-1");
        expect(resultado.torneios[0].status).toBe("finalizado");
        expect(resultado.torneios[1].id).toBe("torneio-2");
    });

    it("deve retornar liga com lista de torneios vazia", async () => {
        const liga = new Liga({ id: "liga-1", nome: "Liga Vazia", donoId: "user-1", torneioIds: [] });
        const ligaGateway = criarMockLigaGateway({
            buscarPorId: jest.fn().mockResolvedValue(liga),
        });
        const torneioGateway = criarMockTorneioGateway();
        const uc = BuscarLiga.criar(ligaGateway, torneioGateway);

        const resultado = await uc.executar({ id: "liga-1" });

        expect(resultado.torneios).toEqual([]);
    });

    it("deve lançar 404 se liga não existir", async () => {
        const ligaGateway = criarMockLigaGateway();
        const torneioGateway = criarMockTorneioGateway();
        const uc = BuscarLiga.criar(ligaGateway, torneioGateway);

        await expect(uc.executar({ id: "inexistente" })).rejects.toMatchObject({ status: 404 });
    });
});
