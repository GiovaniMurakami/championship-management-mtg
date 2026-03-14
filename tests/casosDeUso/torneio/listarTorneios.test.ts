import { ListarTorneios } from "../../../src/casosDeUso/torneio/listarTorneios";
import { criarMockTorneioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";

describe("ListarTorneios", () => {
    it("deve retornar lista de torneios", async () => {
        const torneios = [
            new Torneio({ id: "t1", nome: "T1", horario: new Date(), formato: "legacy", donoId: "u1", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0 }),
            new Torneio({ id: "t2", nome: "T2", horario: new Date(), formato: "modern", donoId: "u1", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3 }),
        ];
        const gateway = criarMockTorneioGateway({
            listar: jest.fn().mockResolvedValue(torneios),
        });
        const uc = ListarTorneios.criar(gateway);

        const resultado = await uc.executar({} as any);

        expect(resultado.torneios).toHaveLength(2);
        expect(resultado.torneios[0].nome).toBe("T1");
        expect(resultado.torneios[1].status).toBe("em_andamento");
    });

    it("deve retornar lista vazia", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = ListarTorneios.criar(gateway);

        const resultado = await uc.executar({} as any);
        expect(resultado.torneios).toEqual([]);
    });
});
