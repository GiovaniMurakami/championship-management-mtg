import {
  criarEmailBoasVindas,
  criarEmailNewsletterMetagame,
  criarEmailResetSenha,
} from "../../../src/infra/services/templatesEmail";

describe("templatesEmail", () => {
  it("gera boas-vindas responsivo e escapa o nome", () => {
    const email = criarEmailBoasVindas('<script>alert("x")</script>');
    expect(email.html).toContain("Bem-vindo");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("/images/top8/rodape.png.png");
    expect(email.html).toContain('alt="Tiago Fuguete"');
    expect(email.texto).toContain("app.tiagofuguete.com.br");
  });

  it("gera reset com link acionável no HTML e no texto", () => {
    const link = "https://app.tiagofuguete.com.br/reset-senha?token=preview";
    const email = criarEmailResetSenha("Jogador", link);
    expect(email.html).toContain(link.replace("&", "&amp;"));
    expect(email.texto).toContain(link);
    expect(email.html).toContain("1 hora");
    expect(email.html).toContain("/images/top8/rodape.png.png");
  });

  it("gera newsletter com seções, preferências e descadastro", () => {
    const email = criarEmailNewsletterMetagame({
      nome: 'Ana <b>"x"</b>',
      linkPreferencias: "https://app.tiagofuguete.com.br/?newsletter=preferencias",
      linkDescadastro: "https://app.tiagofuguete.com.br/newsletter/descadastrar?token=abc.def",
      secoes: [{
        formato: "pauper",
        label: "Pauper",
        totalTorneios: 3,
        totalDecks: 12,
        link: "https://app.tiagofuguete.com.br/metagame?formato=pauper&dias=7",
        arquetipos: [{ nome: "Affinity", metaPercentual: 18.5, winrate: 52.2, totalDecks: 4 }],
      }],
    });

    expect(email.html).toContain("Metagame da semana");
    expect(email.html).toContain("Ana &lt;b&gt;&quot;x&quot;&lt;/b&gt;");
    expect(email.html).toContain("Affinity");
    expect(email.html).toContain("18.5%");
    expect(email.html).toContain("newsletter/descadastrar?token=abc.def");
    expect(email.html).toContain("newsletter=preferencias");
    expect(email.html).toContain("/images/top8/rodape.png.png");
    expect(email.html).not.toContain(">FUGUETE</div>");
    expect(email.texto).toContain("Affinity — 18.5%");
    expect(email.texto).toContain("Não quero mais receber");
  });
});
