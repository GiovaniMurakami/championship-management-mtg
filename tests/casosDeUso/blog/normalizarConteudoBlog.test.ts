import { normalizarConteudoBlog } from "../../../src/helpers/texto/normalizarConteudoBlog";

describe("normalizarConteudoBlog", () => {
  it("preserva html legado existente", () => {
    const html = "<h2>Título</h2><p>Texto</p><p><img src=\"https://cards.scryfall.io/x.jpg\" alt=\"Carta\" /></p>";
    expect(normalizarConteudoBlog(html)).toBe(html);
  });

  it("envolve texto puro em paragrafo customizado", () => {
    expect(normalizarConteudoBlog("Minha Carta FavoritaMyr Enforcer")).toBe(
      "<paragrafo>Minha Carta FavoritaMyr Enforcer</paragrafo>",
    );
  });

  it("preserva markup customizado existente", () => {
    const markup = "<titulo>Título</titulo><paragrafo>Texto</paragrafo><imagem url=\"https://x.jpg\" alt=\"Carta\" carta=\"true\" />";
    expect(normalizarConteudoBlog(markup)).toBe(markup);
  });

  it("remove tags perigosas mas mantem markup do blog", () => {
    const markup = "<titulo>Ok</titulo><script>alert(1)</script><paragrafo>Texto</paragrafo>";
    expect(normalizarConteudoBlog(markup)).toBe("<titulo>Ok</titulo><paragrafo>Texto</paragrafo>");
  });
});
