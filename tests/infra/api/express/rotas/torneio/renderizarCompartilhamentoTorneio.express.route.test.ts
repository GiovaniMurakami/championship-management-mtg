import { montarHtmlCompartilhamentoTorneio, RenderizarCompartilhamentoTorneioRota } from "../../../../../../src/infra/api/express/rotas/torneio/renderizarCompartilhamentoTorneio.express.route";

describe("RenderizarCompartilhamentoTorneioRota", () => {
  it("gera Open Graph no HTML inicial e redireciona para a SPA", () => {
    const html = montarHtmlCompartilhamentoTorneio({
      torneioId: "d99cb000-0000-4000-8000-000000000000",
      title: "Tropical Pauper 296",
      description: "Torneio semanal",
      image: "https://cdn.example.com/banner.jpg",
      imageType: "image/jpeg",
      url: null,
    }, '<html><head><meta property="og:title" content="Genérico"><meta name="twitter:image" content="antiga"></head><body><script src="/assets/app.js"></script></body></html>');
    expect(html).toContain('property="og:title" content="Tropical Pauper 296 | Fuguete Liga Magic"');
    expect(html).toContain('property="og:image" content="https://cdn.example.com/banner.jpg"');
    expect(html).toContain("/torneios/d99cb-tropical-pauper-296");
    expect(html).not.toContain("Genérico");
    expect(html).not.toContain("content=\"antiga\"");
    expect(html).toContain('/assets/app.js');
  });

  it("expõe uma rota pública de compartilhamento", () => {
    const rota = RenderizarCompartilhamentoTorneioRota.criar({ executar: jest.fn() } as any);
    expect(rota.getCaminho()).toBe("/torneio/:torneioId/share");
    expect(rota.getMiddlewares()).toHaveLength(2);
  });
});
