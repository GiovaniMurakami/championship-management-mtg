import { GerarUrlUploadImagemRota } from "../../../../../../src/infra/api/express/rotas/imagem/gerarUrlUploadImagem.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";

function makeReqRes(body: Record<string, unknown> = {}) {
    const req = {
        body,
        usuario: { id: "user-1", email: "a@a.com", nome: "User", role: "user" },
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    return { req, res, next };
}

describe("GerarUrlUploadImagemRota", () => {
    const servico = { executar: vi.fn() } as any;
    const rota = GerarUrlUploadImagemRota.criar(servico);

    beforeEach(() => vi.clearAllMocks());

    it("retorna 200 com uploadUrl e urlPublica em sucesso", async () => {
        const saida = {
            uploadUrl: "https://bucket.s3.amazonaws.com/key?sig=x",
            urlPublica: "https://bucket.s3.amazonaws.com/key",
            chave: "imagens/user-1/abc.jpeg",
        };
        servico.executar.mockResolvedValue(saida);

        const { req, res, next } = makeReqRes({ contentType: "image/jpeg", tamanhoBytes: 1024 });
        await rota.getHandler()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(saida);
        expect(servico.executar).toHaveBeenCalledWith({
            contentType: "image/jpeg",
            tamanhoBytes: 1024,
            usuarioId: "user-1",
            isAdmin: false,
        });
    });

    it("repassa isAdmin=true quando o usuário é admin", async () => {
        servico.executar.mockResolvedValue({
            uploadUrl: "https://bucket.s3.amazonaws.com/key?sig=x",
            urlPublica: "https://bucket.s3.amazonaws.com/key",
            chave: "imagens/admin-1/abc.jpeg",
        });
        const { req, res, next } = makeReqRes({ contentType: "image/jpeg", tamanhoBytes: 1024 });
        req.usuario.role = "admin";
        await rota.getHandler()(req, res, next);
        expect(servico.executar).toHaveBeenCalledWith(expect.objectContaining({ isAdmin: true }));
    });

    it("retorna 400 se contentType ausente", async () => {
        const { req, res, next } = makeReqRes({ tamanhoBytes: 1024 });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(servico.executar).not.toHaveBeenCalled();
    });

    it("retorna 400 se tamanhoBytes ausente", async () => {
        const { req, res, next } = makeReqRes({ contentType: "image/jpeg" });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(servico.executar).not.toHaveBeenCalled();
    });

    it("retorna 400 se contentType nao for imagem valida", async () => {
        const { req, res, next } = makeReqRes({ contentType: "application/pdf", tamanhoBytes: 1024 });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(servico.executar).not.toHaveBeenCalled();
    });

    it("retorna 400 se tamanhoBytes exceder 25 MB no schema", async () => {
        const { req, res, next } = makeReqRes({
            contentType: "image/png",
            tamanhoBytes: 25 * 1024 * 1024 + 1,
        });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(servico.executar).not.toHaveBeenCalled();
    });

    it("aceita no schema tamanho entre 5 e 25 MB (limite user fica no caso de uso)", async () => {
        servico.executar.mockResolvedValue({
            uploadUrl: "https://bucket.s3.amazonaws.com/key?sig=x",
            urlPublica: "https://bucket.s3.amazonaws.com/key",
            chave: "imagens/user-1/abc.png",
        });
        const { req, res, next } = makeReqRes({
            contentType: "image/png",
            tamanhoBytes: 6 * 1024 * 1024,
        });
        await rota.getHandler()(req, res, next);
        expect(servico.executar).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("retorna 400 se tamanhoBytes for 0", async () => {
        const { req, res, next } = makeReqRes({ contentType: "image/png", tamanhoBytes: 0 });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("retorna status do ErroPersonalizado quando lancado pelo servico", async () => {
        servico.executar.mockRejectedValue(
            ErroPersonalizado.criar({ mensagem: "Erro.", status: StatusErro.erroParametro })
        );
        const { req, res, next } = makeReqRes({ contentType: "image/jpeg", tamanhoBytes: 512 });
        await rota.getHandler()(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensagem: "Erro." }));
    });

    it("chama next() em erros desconhecidos", async () => {
        const err = new Error("s3 error");
        servico.executar.mockRejectedValue(err);
        const { req, res, next } = makeReqRes({ contentType: "image/webp", tamanhoBytes: 2048 });
        await rota.getHandler()(req, res, next);
        expect(next).toHaveBeenCalledWith(err);
    });

    it("retorna caminho correto e metodo POST", () => {
        expect(rota.getCaminho()).toBe("/imagem/upload-url");
        expect(rota.getMetodo()).toBe("post");
    });

    it("inclui autenticarJwt e uploadImagemRateLimiter nos middlewares", () => {
        const middlewares = rota.getMiddlewares!();
        expect(middlewares).toHaveLength(2);
    });
});
