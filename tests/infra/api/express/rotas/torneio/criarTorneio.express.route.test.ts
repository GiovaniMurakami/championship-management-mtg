import { CriarTorneioRota } from "../../../../../../src/infra/api/express/rotas/torneio/criarTorneio.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";

function makeReqRes(body: Record<string, unknown> = {}) {
    const req = {
        body,
        usuario: { id: "admin-1", email: "a@a.com", nome: "Admin", role: "admin" },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    return { req, res, next };
}

describe("CriarTorneioRota", () => {
    const servico = { executar: jest.fn() } as any;
    const rota = CriarTorneioRota.criar(servico);

    beforeEach(() => jest.clearAllMocks());

    it("retorna 400 se campos obrigatorios ausentes", async () => {
        const { req, res, next } = makeReqRes({ nome: "Torneio" });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensagem: expect.any(String) }));
    });

    it("retorna 201 com torneio criado", async () => {
        const saida = { id: "t-1", nome: "Torneio", formato: "Standard" };
        servico.executar.mockResolvedValue(saida);
        const { req, res, next } = makeReqRes({
            nome: "Torneio",
            horario: new Date().toISOString(),
            formato: "Standard",
        });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(saida);
    });

    it("retorna status do ErroPersonalizado quando lancado", async () => {
        servico.executar.mockRejectedValue(
            ErroPersonalizado.criar({ mensagem: "Erro.", status: StatusErro.erroParametro })
        );
        const { req, res, next } = makeReqRes({
            nome: "Torneio",
            horario: new Date().toISOString(),
            formato: "Standard",
        });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("chama next() em erros desconhecidos", async () => {
        const err = new Error("db error");
        servico.executar.mockRejectedValue(err);
        const { req, res, next } = makeReqRes({
            nome: "Torneio",
            horario: new Date().toISOString(),
            formato: "Standard",
        });
        await rota.getHandler()(req, res, next);
        expect(next).toHaveBeenCalledWith(err);
    });
});
