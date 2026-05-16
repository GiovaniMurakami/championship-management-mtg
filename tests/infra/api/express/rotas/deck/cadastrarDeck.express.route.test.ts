import { CadastrarDeckRota } from "../../../../../../src/infra/api/express/rotas/deck/cadastrarDeck.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";

const maindeck = [{ nome: "Lightning Bolt", quantidade: 4 }];

function makeReqRes(body: Record<string, unknown> = {}) {
    const req = {
        body,
        usuario: { id: "u-1", email: "a@a.com", nome: "User", role: "user" },
    } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    return { req, res, next };
}

describe("CadastrarDeckRota", () => {
    const servico = { executar: jest.fn() } as any;
    const rota = CadastrarDeckRota.criar(servico);

    beforeEach(() => jest.clearAllMocks());

    it("retorna 400 se campos obrigatorios ausentes", async () => {
        const { req, res, next } = makeReqRes({ nome: "Burn" });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("retorna 400 se maindeck nao for array", async () => {
        const { req, res, next } = makeReqRes({ nome: "Burn", formato: "Modern", maindeck: "invalido" });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("retorna 201 com deck criado", async () => {
        const saida = { id: "d-1", nome: "Burn", formato: "Modern", commander: [] };
        servico.executar.mockResolvedValue(saida);
        const { req, res, next } = makeReqRes({ nome: "Burn", formato: "Modern", maindeck });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(saida);
    });

    it("passa sideboard como array vazio quando ausente", async () => {
        servico.executar.mockResolvedValue({ id: "d-1" });
        const { req, res, next } = makeReqRes({ nome: "Burn", formato: "Modern", maindeck });
        await rota.getHandler()(req, res, next);
        expect(servico.executar).toHaveBeenCalledWith(
            expect.objectContaining({ sideboard: [] })
        );
    });

    it("encaminha commander quando informado", async () => {
        servico.executar.mockResolvedValue({ id: "d-1" });
        const commander = [{ nome: "Atraxa, Praetors' Voice", quantidade: 1 }];
        const { req, res, next } = makeReqRes({ nome: "Atraxa", formato: "Commander", maindeck, commander });
        await rota.getHandler()(req, res, next);
        expect(servico.executar).toHaveBeenCalledWith(
            expect.objectContaining({ commander })
        );
    });

    it("retorna status do ErroPersonalizado quando lancado", async () => {
        servico.executar.mockRejectedValue(
            ErroPersonalizado.criar({ mensagem: "Deck invÃ¡lido.", status: StatusErro.erroParametro })
        );
        const { req, res, next } = makeReqRes({ nome: "Burn", formato: "Modern", maindeck });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("chama next() em erros desconhecidos", async () => {
        const err = new Error("db error");
        servico.executar.mockRejectedValue(err);
        const { req, res, next } = makeReqRes({ nome: "Burn", formato: "Modern", maindeck });
        await rota.getHandler()(req, res, next);
        expect(next).toHaveBeenCalledWith(err);
    });
});
