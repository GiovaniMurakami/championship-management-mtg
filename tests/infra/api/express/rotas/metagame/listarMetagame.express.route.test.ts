import { ListarMetagameRota } from "../../../../../../src/infra/api/express/rotas/metagame/listarMetagame.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";
import { heavyReadRateLimiter } from "../../../../../../src/middlewares/express/rateLimiter";

function makeReqRes(query = { formato: "pauper", dias: 30 }) {
    const req = { queryValidados: query } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    return { req, res, next };
}

describe("ListarMetagameRota", () => {
    const servico = { executar: jest.fn() } as any;
    const rota = ListarMetagameRota.criar(servico);

    beforeEach(() => jest.clearAllMocks());

    it("deve ser rota publica sem autenticarJwt", () => {
        expect(rota.getCaminho()).toBe("/metagame");
        expect(rota.getMetodo()).toBe("get");
        expect(rota.getMiddlewares()).toHaveLength(2);
        expect(rota.getMiddlewares()[0]).toBe(heavyReadRateLimiter);
    });

    it("retorna 200 com o metagame", async () => {
        const saida = { formato: "pauper", dias: 30, totalDecks: 0, totalTorneios: 0, arquetipos: [] };
        servico.executar.mockResolvedValue(saida);
        const { req, res, next } = makeReqRes();

        await rota.getHandler()(req, res, next);

        expect(servico.executar).toHaveBeenCalledWith({ formato: "pauper", dias: 30 });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(saida);
        expect(next).not.toHaveBeenCalled();
    });

    it("retorna status do ErroPersonalizado quando lancado", async () => {
        servico.executar.mockRejectedValue(
            ErroPersonalizado.criar({ mensagem: "dias deve ser 7, 14, 30 ou 90.", status: StatusErro.erroParametro })
        );
        const { req, res, next } = makeReqRes({ formato: "pauper", dias: 15 });

        await rota.getHandler()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
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
