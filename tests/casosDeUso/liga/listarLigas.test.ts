import { ListarLigas } from "../../../src/casosDeUso/liga/listarLigas";
import { criarMockLigaGateway } from "../../mocks/gateways";
import { Liga } from "../../../src/dominio/entidade/liga";

describe("ListarLigas", () => {
    it("deve retornar lista vazia quando não há ligas", async () => {
        const gateway = criarMockLigaGateway();
        const uc = ListarLigas.criar(gateway);

        const resultado = await uc.executar({});

        expect(resultado.ligas).toEqual([]);
    });

    it("deve listar ligas com totalTorneios correto", async () => {
        const ligas = [
            new Liga({ id: "liga-1", nome: "Liga A", donoId: "user-1", torneioIds: ["t1", "t2", "t3"] }),
            new Liga({ id: "liga-2", nome: "Liga B", donoId: "user-2", torneioIds: [] }),
        ];
        const gateway = criarMockLigaGateway({
            listar: jest.fn().mockResolvedValue(ligas),
        });
        const uc = ListarLigas.criar(gateway);

        const resultado = await uc.executar({});

        expect(resultado.ligas).toHaveLength(2);
        expect(resultado.ligas[0].totalTorneios).toBe(3);
        expect(resultado.ligas[1].totalTorneios).toBe(0);
        expect(resultado.ligas[0].nome).toBe("Liga A");
    });

    it("deve incluir descricao quando presente", async () => {
        const liga = new Liga({
            id: "liga-1",
            nome: "Liga C",
            descricao: "Descrição da liga",
            donoId: "user-1",
            torneioIds: [],
            bannerUrl: "https://bucket/banner.png",
            tipo: "times",
        });
        const gateway = criarMockLigaGateway({
            listar: jest.fn().mockResolvedValue([liga]),
        });
        const uc = ListarLigas.criar(gateway);

        const resultado = await uc.executar({});

        expect(resultado.ligas[0].descricao).toBe("Descrição da liga");
        expect(resultado.ligas[0].bannerUrl).toBe("https://bucket/banner.png");
        expect(resultado.ligas[0].tipo).toBe("times");
    });
});
