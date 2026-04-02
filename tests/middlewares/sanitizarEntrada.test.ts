import { Request, Response, NextFunction } from "express";
import { sanitizarEntrada } from "../../src/middlewares/express/sanitizarEntrada";

function makeReq(
    body?: unknown,
    query?: Record<string, unknown>,
    params?: Record<string, unknown>
): Partial<Request> {
    return { body, query, params } as Partial<Request>;
}

describe("sanitizarEntrada middleware", () => {
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        res = {};
        next = jest.fn();
    });

    describe("sanitização de body", () => {
        it("remove a tag <script> mas preserva o conteúdo textual entre as tags", () => {
            // Num API JSON o conteúdo entre tags é preservado; somente as marcações são removidas.
            // O cliente deve escapar ao renderizar em HTML.
            const req = makeReq({ nome: "<script>alert('xss')</script>Jogador" });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.nome).toBe("alert('xss')Jogador");
            expect(req.body.nome).not.toContain("<script>");
            expect(req.body.nome).not.toContain("</script>");
        });

        it("remove tag <img onerror> por completo (sem conteúdo interno)", () => {
            const req = makeReq({ nome: '<img src=x onerror=alert(1)>Nome' });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.nome).toBe("Nome");
        });

        it("remove tag <a> mas preserva o texto âncora", () => {
            const req = makeReq({ link: '<a href="javascript:void(0)">clique</a>' });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.link).toBe("clique");
            expect(req.body.link).not.toContain("<a");
            expect(req.body.link).not.toContain("</a>");
        });

        it("remove múltiplas tags HTML aninhadas", () => {
            const req = makeReq({ descricao: "<b><i>texto</i></b>" });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.descricao).toBe("texto");
        });

        it("remove null bytes de strings no body", () => {
            const req = makeReq({ nome: "foo\0bar" });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.nome).toBe("foobar");
        });

        it("preserva strings sem HTML intactas", () => {
            const req = makeReq({ nome: "João da Silva" });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.nome).toBe("João da Silva");
        });

        it("preserva valores numéricos", () => {
            const req = makeReq({ quantidade: 4 });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.quantidade).toBe(4);
        });

        it("preserva valores booleanos", () => {
            const req = makeReq({ ativo: true });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.ativo).toBe(true);
        });

        it("preserva null", () => {
            const req = makeReq({ campo: null });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.campo).toBeNull();
        });
    });

    describe("sanitização recursiva", () => {
        it("sanitiza strings em objetos aninhados", () => {
            const req = makeReq({
                usuario: { nome: "<script>hack</script>Carlos" },
            });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.usuario.nome).not.toContain("<script>");
            expect(req.body.usuario.nome).not.toContain("</script>");
            expect(req.body.usuario.nome).toContain("Carlos");
        });

        it("sanitiza strings dentro de arrays (ex: maindeck)", () => {
            const req = makeReq({
                maindeck: [
                    { nome: "<b>Lightning Bolt</b>", quantidade: 4 },
                    { nome: "Mountain", quantidade: 56 },
                ],
            });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.maindeck[0].nome).toBe("Lightning Bolt");
            expect(req.body.maindeck[1].nome).toBe("Mountain");
            expect(req.body.maindeck[0].quantidade).toBe(4);
        });

        it("sanitiza objetos com múltiplos níveis de aninhamento", () => {
            const req = makeReq({
                nivel1: { nivel2: { nivel3: "<script>deep</script>valor" } },
            });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.nivel1.nivel2.nivel3).not.toContain("<script>");
            expect(req.body.nivel1.nivel2.nivel3).toContain("valor");
        });

        it("sanitiza array de strings diretamente", () => {
            const req = makeReq({
                tags: ["<b>tag1</b>", "<i>tag2</i>", "tag3"],
            });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.body.tags).toEqual(["tag1", "tag2", "tag3"]);
        });
    });

    describe("sanitização de query params", () => {
        it("remove tags HTML de query params", () => {
            const req = makeReq(
                undefined,
                { formato: "<script>xss</script>modern" }
            );
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.query!.formato).not.toContain("<script>");
            expect(req.query!.formato).toContain("modern");
        });

        it("preserva query params sem HTML", () => {
            const req = makeReq(undefined, { limite: "10", offset: "0" });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.query!.limite).toBe("10");
            expect(req.query!.offset).toBe("0");
        });
    });

    describe("sanitização de route params", () => {
        it("remove tags HTML de route params", () => {
            const req = makeReq(
                undefined,
                undefined,
                { torneioId: "<script>xss</script>abc-123" }
            );
            sanitizarEntrada(req as Request, res as Response, next);
            expect(req.params!.torneioId).not.toContain("<script>");
            expect(req.params!.torneioId).toContain("abc-123");
        });
    });

    describe("comportamento do middleware", () => {
        it("sempre chama next()", () => {
            const req = makeReq({ nome: "qualquer" });
            sanitizarEntrada(req as Request, res as Response, next);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it("chama next() mesmo com body undefined", () => {
            const req = makeReq(undefined);
            sanitizarEntrada(req as Request, res as Response, next);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it("chama next() mesmo com body vazio", () => {
            const req = makeReq({});
            sanitizarEntrada(req as Request, res as Response, next);
            expect(next).toHaveBeenCalledTimes(1);
        });
    });

    describe("vetores de ataque XSS — tags sempre removidas", () => {
        // Garante que nenhum símbolo '<tag>' sobreviva ao middleware
        const casos: Array<{ descricao: string; entrada: string; naoDeveConter: string[] }> = [
            {
                descricao: "tag <script> case-insensitive",
                entrada: "<ScRiPt>alert(1)</ScRiPt>payload",
                naoDeveConter: ["<ScRiPt>", "</ScRiPt>", "<script>", "</script>"],
            },
            {
                descricao: "tag <svg onload>",
                entrada: "<svg onload=alert(1)>texto",
                naoDeveConter: ["<svg"],
            },
            {
                descricao: "tag <iframe src=javascript>",
                entrada: "<iframe src='javascript:alert(1)'></iframe>texto",
                naoDeveConter: ["<iframe", "</iframe>"],
            },
            {
                descricao: "tag <body onload>",
                entrada: "<body onload=alert(1)>texto",
                naoDeveConter: ["<body"],
            },
            {
                descricao: "tag <img onerror> sem conteúdo interno",
                entrada: "<img src=x onerror=alert(1)>",
                naoDeveConter: ["<img"],
            },
        ];

        casos.forEach(({ descricao, entrada, naoDeveConter }) => {
            it(`remove ${descricao}`, () => {
                const req = makeReq({ campo: entrada });
                sanitizarEntrada(req as Request, res as Response, next);
                naoDeveConter.forEach((proibido) => {
                    expect(req.body.campo).not.toContain(proibido);
                });
            });
        });
    });
});
