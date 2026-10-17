import { GerarSitemap, montarXmlSitemap } from "../../../src/casosDeUso/site/gerarSitemap";

describe("GerarSitemap", () => {
  const originalFrontend = process.env.FRONTEND_URL;
  const originalIsLocal = process.env.IS_LOCAL;

  beforeEach(() => {
    process.env.IS_LOCAL = "false";
    process.env.FRONTEND_URL = "https://tiagofuguete.com.br";
  });

  afterEach(() => {
    if (originalFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontend;
    if (originalIsLocal === undefined) delete process.env.IS_LOCAL;
    else process.env.IS_LOCAL = originalIsLocal;
  });

  it("monta urls estáticas, torneios públicos e artigos publicados", async () => {
    const torneioGateway = {
      listar: vi.fn()
        .mockResolvedValueOnce([
          {
            id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
            nome: "Tropical Pauper 300",
            secreto: false,
            status: "em_andamento",
            criadoEm: new Date("2026-10-01T12:00:00Z"),
          },
          {
            id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
            nome: "Secreto",
            secreto: true,
            status: "aberto",
            criadoEm: new Date("2026-10-02T12:00:00Z"),
          },
        ])
        .mockResolvedValueOnce([]),
    };
    const artigoGateway = {
      listar: vi.fn().mockResolvedValue([
        {
          id: "cccccccc-3333-4333-8333-cccccccccccc",
          titulo: "Guia de Side",
          atualizadoEm: new Date("2026-09-15T10:00:00Z"),
          publicadoEm: new Date("2026-09-10T10:00:00Z"),
          criadoEm: new Date("2026-09-01T10:00:00Z"),
        },
      ]),
    };

    const caso = GerarSitemap.criar(torneioGateway as any, artigoGateway as any);
    const { urls } = await caso.executar();

    expect(urls.some((u) => u.loc === "https://tiagofuguete.com.br/")).toBe(true);
    expect(urls.some((u) => u.loc === "https://tiagofuguete.com.br/torneios")).toBe(true);
    expect(urls.some((u) => u.loc.includes("/torneios/aaaaa-tropical-pauper-300"))).toBe(true);
    expect(urls.some((u) => u.loc.includes("secreto"))).toBe(false);
    expect(urls.some((u) => u.loc.includes("/artigos/ccccc-guia-de-side"))).toBe(true);
    expect(torneioGateway.listar).toHaveBeenCalledWith(expect.objectContaining({ incluirSecretos: false }));
  });
});

describe("montarXmlSitemap", () => {
  it("gera xml válido com escape", () => {
    const xml = montarXmlSitemap([
      {
        loc: "https://tiagofuguete.com.br/torneios?a=1&b=2",
        lastmod: "2026-10-01",
        changefreq: "daily",
        priority: "0.9",
      },
    ]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<urlset");
    expect(xml).toContain("https://tiagofuguete.com.br/torneios?a=1&amp;b=2");
    expect(xml).toContain("<lastmod>2026-10-01</lastmod>");
  });
});
