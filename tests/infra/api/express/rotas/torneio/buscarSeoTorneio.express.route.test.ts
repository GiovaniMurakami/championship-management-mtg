import { BuscarSeoTorneioRota } from "../../../../../../src/infra/api/express/rotas/torneio/buscarSeoTorneio.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";

function makeReqRes(torneioId = "t-1") {
    const req = { params: { torneioId } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    return { req, res, next };
}

describe("BuscarSeoTorneioRota", () => {
    const servico = { executar: jest.fn() } as any;
    const rota = BuscarSeoTorneioRota.criar(servico);

    beforeEach(() => jest.clearAllMocks());

    it("deve ser rota publica sem autenticarJwt", () => {
        expect(rota.getCaminho()).toBe("/torneio/:torneioId/seo");
        expect(rota.getMetodo()).toBe("get");
        expect(rota.getMiddlewares()).toHaveLength(1);
    });

    it("retorna 200 com dados SEO", async () => {
        const saida = {
            torneioId: "t-1",
            title: "Torneio",
            image: "https://cdn.example.com/banner.png",
            description: null,
            url: null,
        };
        servico.executar.mockResolvedValue(saida);
        const { req, res, next } = makeReqRes();

        await rota.getHandler()(req, res, next);

        expect(servico.executar).toHaveBeenCalledWith({ torneioId: "t-1" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(saida);
        expect(next).not.toHaveBeenCalled();
    });

    it("retorna status do ErroPersonalizado quando lancado", async () => {
        servico.executar.mockRejectedValue(
            ErroPersonalizado.criar({ mensagem: "Nao encontrado.", status: StatusErro.erroNaoEncontrado })
        );
        const { req, res, next } = makeReqRes();

        await rota.getHandler()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(next).not.toHaveBeenCalled();
    });

    it("chama next em erro desconhecido", async () => {
        const erro = new Error("db");
        servico.executar.mockRejectedValue(erro);
        const { req, res, next } = makeReqRes();

        await rota.getHandler()(req, res, next);

        expect(next).toHaveBeenCalledWith(erro);
    });
});
