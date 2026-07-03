import { CadastrarUsuarioRota } from "../../../../../../src/infra/api/express/rotas/usuario/cadastrarUsuario.express.route";
import { LoginUsuarioRota } from "../../../../../../src/infra/api/express/rotas/usuario/loginUsuario.express.route";
import { LogoutUsuarioRota } from "../../../../../../src/infra/api/express/rotas/usuario/logoutUsuario.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";

function makeReqRes(body: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
    const req = { body, headers, usuario: undefined } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    return { req, res, next };
}

describe("CadastrarUsuarioRota", () => {
    const servico = { executar: jest.fn() } as any;
    const rota = CadastrarUsuarioRota.criar(servico);
    const payloadValido = {
        nome: "Joao",
        email: "j@j.com",
        senha: "senha1234",
        aceiteTermos: true,
    };

    beforeEach(() => jest.clearAllMocks());

    it("retorna 400 se campos obrigatorios ausentes", async () => {
        const { req, res, next } = makeReqRes({ nome: "Joao" });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensagem: expect.any(String) }));
    });

    it("retorna 201 com dados do usuario criado", async () => {
        const saida = { id: "u-1", nome: "Joao", email: "j@j.com" };
        servico.executar.mockResolvedValue(saida);
        const { req, res, next } = makeReqRes(payloadValido);
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(saida);
    });

    it("retorna status do ErroPersonalizado quando lancado", async () => {
        servico.executar.mockRejectedValue(
            ErroPersonalizado.criar({ mensagem: "E-mail já cadastrado.", status: StatusErro.erroParametro })
        );
        const { req, res, next } = makeReqRes(payloadValido);
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("chama next() em erros desconhecidos", async () => {
        const err = new Error("db error");
        servico.executar.mockRejectedValue(err);
        const { req, res, next } = makeReqRes(payloadValido);
        await rota.getHandler()(req, res, next);
        expect(next).toHaveBeenCalledWith(err);
    });
});

describe("LoginUsuarioRota", () => {
    const servico = { executar: jest.fn() } as any;
    const rota = LoginUsuarioRota.criar(servico);

    beforeEach(() => jest.clearAllMocks());

    it("retorna 400 se email ou senha ausentes", async () => {
        const { req, res, next } = makeReqRes({ email: "j@j.com" });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("retorna 200 com token em login bem-sucedido", async () => {
        const saida = { token: "jwt-token" };
        servico.executar.mockResolvedValue(saida);
        const { req, res, next } = makeReqRes({ email: "j@j.com", senha: "senha1234" });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(saida);
    });

    it("retorna 401 em credenciais invalidas", async () => {
        servico.executar.mockRejectedValue(
            ErroPersonalizado.criar({ mensagem: "Credenciais inválidas.", status: StatusErro.erroNaoAutorizado })
        );
        const { req, res, next } = makeReqRes({ email: "j@j.com", senha: "errado" });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe("LogoutUsuarioRota", () => {
    const servico = { executar: jest.fn() } as any;
    const rota = LogoutUsuarioRota.criar(servico);

    beforeEach(() => jest.clearAllMocks());

    it("retorna 200 em logout bem-sucedido", async () => {
        const saida = { mensagem: "Logout realizado com sucesso." };
        servico.executar.mockResolvedValue(saida);
        const { req, res, next } = makeReqRes({}, { authorization: "Bearer valid-token" });
        req.usuario = { id: "u-1", email: "j@j.com", nome: "Joao", role: "user" };
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(saida);
        expect(servico.executar).toHaveBeenCalledWith({ token: "valid-token", usuarioId: "u-1" });
    });

    it("chama next() em erros desconhecidos", async () => {
        const err = new Error("db error");
        servico.executar.mockRejectedValue(err);
        const { req, res, next } = makeReqRes({}, { authorization: "Bearer valid-token" });
        req.usuario = { id: "u-1", email: "j@j.com", nome: "Joao", role: "user" };
        await rota.getHandler()(req, res, next);
        expect(next).toHaveBeenCalledWith(err);
    });
});
