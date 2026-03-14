import { ErroPersonalizado } from "../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../src/helpers/error/statusErro";

describe("ErroPersonalizado", () => {
    it("deve criar um erro com todos os parâmetros", () => {
        const erro = ErroPersonalizado.criar({
            mensagem: "Erro de teste",
            status: 400,
            erros: ["campo1 inválido", "campo2 inválido"],
            extra: { detalhe: "info extra" },
        });

        expect(erro).toBeInstanceOf(ErroPersonalizado);
        expect(erro).toBeInstanceOf(Error);
        expect(erro.message).toBe("Erro de teste");
        expect(erro.status).toBe(400);
        expect(erro.erros).toEqual(["campo1 inválido", "campo2 inválido"]);
        expect(erro.extra).toEqual({ detalhe: "info extra" });
    });

    it("deve usar valores padrão quando não fornecidos", () => {
        const erro = ErroPersonalizado.criar({
            mensagem: "",
            status: 0,
        });

        expect(erro.message).toBe("Erro interno do servidor");
        expect(erro.status).toBe(500);
        expect(erro.erros).toEqual([]);
        expect(erro.extra).toBeNull();
    });

    it("formatarErros deve juntar os erros com quebra de linha", () => {
        const erro = ErroPersonalizado.criar({
            mensagem: "Erro",
            status: 400,
            erros: ["erro1", "erro2", "erro3"],
        });

        expect(erro.formatarErros()).toBe("erro1\nerro2\nerro3");
    });

    it("formatarErros sem erros deve retornar string vazia", () => {
        const erro = ErroPersonalizado.criar({ mensagem: "Erro", status: 400 });
        expect(erro.formatarErros()).toBe("");
    });

    it("erroSemStatus deve retornar objeto sem status", () => {
        const erro = ErroPersonalizado.criar({
            mensagem: "Teste",
            status: 404,
            erros: ["detalhe"],
            extra: 42,
        });

        const resultado = erro.erroSemStatus();

        expect(resultado).toEqual({
            mensagem: "Teste",
            erros: ["detalhe"],
            extra: 42,
        });
        expect(resultado).not.toHaveProperty("status");
    });
});

describe("StatusErro", () => {
    it("deve conter os status HTTP corretos", () => {
        expect(StatusErro.erroParametro).toBe(400);
        expect(StatusErro.erroNaoAutorizado).toBe(401);
        expect(StatusErro.erroProibido).toBe(403);
        expect(StatusErro.erroNaoEncontrado).toBe(404);
        expect(StatusErro.erroServidor).toBe(500);
    });
});
