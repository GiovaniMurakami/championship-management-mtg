import { ListarTorneiosRota } from "../../../../../../src/infra/api/express/rotas/torneio/listarTorneios.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";

function makeReqRes(query: Record<string, string> = {}) {
    const req = {
        query,
        usuario: { id: "u-1", email: "a@a.com", nome: "User", role: "user" },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    return { req, res, next };
}

describe("ListarTorneiosRota", () => {
    const servico = { executar: jest.fn() } as any;
    const rota = ListarTorneiosRota.criar(servico);

    beforeEach(() => jest.clearAllMocks());

    it("retorna 200 com lista de torneios paginada", async () => {
        const saida = { torneios: [], total: 0, limite: 20, offset: 0 };
        servico.executar.mockResolvedValue(saida);
        const { req, res, next } = makeReqRes();
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(saida);
        expect(servico.executar).toHaveBeenCalledWith({
            usuarioId: "u-1",
            limite: undefined,
            offset: undefined,
        });
    });

    it("passa limite e offset do query string para o servico", async () => {
        servico.executar.mockResolvedValue({ torneios: [], total: 0, limite: 10, offset: 5 });
        const { req, res, next } = makeReqRes({ limite: "10", offset: "5" });
        await rota.getHandler()(req, res, next);
        expect(servico.executar).toHaveBeenCalledWith({
            usuarioId: "u-1",
            limite: 10,
            offset: 5,
        });
    });

    it("retorna status do ErroPersonalizado quando lancado", async () => {
        servico.executar.mockRejectedValue(
            ErroPersonalizado.criar({ mensagem: "Erro.", status: StatusErro.erroServidor })
        );
        const { req, res, next } = makeReqRes();
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it("chama next() em erros desconhecidos", async () => {
        const err = new Error("db error");
        servico.executar.mockRejectedValue(err);
        const { req, res, next } = makeReqRes();
        await rota.getHandler()(req, res, next);
        expect(next).toHaveBeenCalledWith(err);
    });
});
