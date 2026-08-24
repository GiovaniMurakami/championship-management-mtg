import { criarEmailBoasVindas, criarEmailResetSenha } from "../../../src/infra/services/templatesEmail";

describe("templatesEmail", () => {
    it("gera boas-vindas responsivo e escapa o nome", () => {
        const email = criarEmailBoasVindas('<script>alert("x")</script>');
        expect(email.html).toContain("Bem-vindo");
        expect(email.html).toContain("&lt;script&gt;");
        expect(email.html).not.toContain("<script>");
        expect(email.texto).toContain("app.tiagofuguete.com.br");
    });

    it("gera reset com link acionável no HTML e no texto", () => {
        const link = "https://app.tiagofuguete.com.br/reset-senha?token=preview";
        const email = criarEmailResetSenha("Jogador", link);
        expect(email.html).toContain(link.replace("&", "&amp;"));
        expect(email.texto).toContain(link);
        expect(email.html).toContain("1 hora");
    });
});
