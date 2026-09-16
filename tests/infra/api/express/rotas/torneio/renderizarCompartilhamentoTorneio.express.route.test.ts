import { montarHtmlCompartilhamentoTorneio, RenderizarCompartilhamentoTorneioRota, scriptBootstrapSpa } from "../../../../../../src/infra/api/express/rotas/torneio/renderizarCompartilhamentoTorneio.express.route";

const SEO = {
  torneioId: "d99cb000-0000-4000-8000-000000000000",
  title: "Tropical Pauper 296",
  description: "Torneio semanal",
  image: "https://cdn.example.com/banner.jpg",
  imageType: "image/jpeg",
  url: null,
};

function makeReqRes(host = "app.tiagofuguete.com.br") {
  const headers: Record<string, string> = { "x-forwarded-host": host, "user-agent": "Mozilla/5.0" };
  const req = {
    params: { torneioId: "d99cb-tropical-pauper-296" },
    headers,
    hostname: host,
  } as any;
  const headersSet: Record<string, string> = {};
  const removed: string[] = [];
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn((key: string, value: string) => { headersSet[key] = value; return res; }),
    removeHeader: jest.fn((key: string) => { removed.push(key); }),
  } as any;
  return { req, res, next: jest.fn(), headersSet, removed };
}

describe("RenderizarCompartilhamentoTorneioRota", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("gera Open Graph no HTML inicial sem embutir bundle com hash", () => {
    const html = montarHtmlCompartilhamentoTorneio(
      SEO,
      '<html><head><title>Genérico</title><meta property="og:title" content="Genérico"><meta name="twitter:image" content="antiga"><script type="module" src="/assets/index-OLDHASH.js"></script><link rel="stylesheet" href="/assets/index-OLD.css"></head><body></body></html>',
      "https://app.tiagofuguete.com.br",
    );
    expect(html).toContain('property="og:title" content="Tropical Pauper 296 | Fuguete Liga Magic"');
    expect(html).toContain('property="og:image" content="https://cdn.example.com/banner.jpg"');
    expect(html).toContain("/torneios/d99cb-tropical-pauper-296");
    expect(html).not.toContain("Genérico");
    expect(html).not.toContain("content=\"antiga\"");
    expect(html).not.toContain("/assets/index-OLDHASH.js");
    expect(html).not.toContain("/assets/index-OLD.css");
    expect(html).toContain('data-ssr-bootstrap="spa"');
    expect(html).toContain(scriptBootstrapSpa("https://app.tiagofuguete.com.br"));
  });

  it("expõe uma rota pública de compartilhamento", () => {
    const rota = RenderizarCompartilhamentoTorneioRota.criar({ executar: jest.fn() } as any);
    expect(rota.getCaminho()).toBe("/torneio/:torneioId/share");
    expect(rota.getMiddlewares()).toHaveLength(2);
  });

  it("responde HTML com bootstrap e sem cache para o browser", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => SEO,
    }) as typeof fetch;

    const rota = RenderizarCompartilhamentoTorneioRota.criar({ executar: jest.fn() } as any);
    const { req, res, next, headersSet, removed } = makeReqRes();

    await rota.getHandler()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(headersSet["Cache-Control"]).toBe("private, no-store, must-revalidate");
    expect(removed).toEqual(expect.arrayContaining(["Content-Security-Policy", "X-Frame-Options"]));
    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain('data-ssr-bootstrap="spa"');
    expect(html).not.toMatch(/\/assets\/index-[^"']+\.js/);
    expect(html).toContain("Tropical Pauper 296 | Fuguete Liga Magic");
  });
});
