import { BuscarArquetipoMetagameRota } from "../../../../../../src/infra/api/express/rotas/metagame/buscarArquetipoMetagame.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";
import { heavyReadRateLimiter } from "../../../../../../src/middlewares/express/rateLimiter";

function makeReqRes() {
    const req = {
        paramsValidados: { formato: "pauper", slug: "blue-terror" },
        queryValidados: { dias: 30 },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    return { req, res, next };
}

describe("BuscarArquetipoMetagameRota", () => {
    const servico = { executar: jest.fn() } as any;
    const rota = BuscarArquetipoMetagameRota.criar(servico);

    beforeEach(() => jest.clearAllMocks());

    it("deve ser rota publica sem autenticarJwt", () => {
        expect(rota.getCaminho()).toBe("/metagame/:formato/:slug");
        expect(rota.getMetodo()).toBe("get");
        expect(rota.getMiddlewares()).toHaveLength(3);
        expect(rota.getMiddlewares()[0]).toBe(heavyReadRateLimiter);
    });

    it("retorna 200 com o arquétipo", async () => {
        const saida = { formato: "pauper", slug: "blue-terror", nome: "Blue Terror" };
        servico.executar.mockResolvedValue(saida);
        const { req, res, next } = makeReqRes();

        await rota.getHandler()(req, res, next);

        expect(servico.executar).toHaveBeenCalledWith({
            formato: "pauper",
            slug: "blue-terror",
            dias: 30,
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(saida);
        expect(next).not.toHaveBeenCalled();
    });

    it("retorna 404 quando o arquétipo não existe", async () => {
        servico.executar.mockRejectedValue(
            ErroPersonalizado.criar({
                mensagem: "Arquétipo não encontrado neste período.",
                status: StatusErro.erroNaoEncontrado,
            })
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
