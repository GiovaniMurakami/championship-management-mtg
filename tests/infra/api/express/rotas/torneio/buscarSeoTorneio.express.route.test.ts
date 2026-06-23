import { BuscarSeoTorneioRota } from "../../../../../../src/infra/api/express/rotas/torneio/buscarSeoTorneio.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";

const TORNEIO_ID = "550e8400-e29b-41d4-a716-446655440001";

function makeReqRes(torneioId = TORNEIO_ID) {
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
        expect(rota.getMiddlewares()).toHaveLength(2);
    });

    it("retorna 200 com dados SEO", async () => {
        const saida = {
            torneioId: TORNEIO_ID,
            title: "Torneio",
            image: "https://cdn.example.com/banner.png",
            description: null,
            url: null,
        };
        servico.executar.mockResolvedValue(saida);
        const { req, res, next } = makeReqRes();

        await rota.getHandler()(req, res, next);

        expect(servico.executar).toHaveBeenCalledWith({ torneioId: TORNEIO_ID });
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
