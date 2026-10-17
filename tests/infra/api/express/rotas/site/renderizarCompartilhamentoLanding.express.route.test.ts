import {
  RenderizarCompartilhamentoLandingRota,
} from "../../../../../../src/infra/api/express/rotas/site/renderizarCompartilhamentoLanding.express.route";

function makeReqRes(pagina?: string, host = "tiagofuguete.com.br") {
  const req = {
    params: pagina ? { pagina } : {},
    headers: { "x-forwarded-host": host, "user-agent": "facebookexternalhit/1.1" },
    hostname: host,
  } as any;
  const headersSet: Record<string, string> = {};
  const res = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    set: vi.fn((key: string, value: string) => { headersSet[key] = value; return res; }),
    removeHeader: vi.fn(),
  } as any;
  return { req, res, next: vi.fn(), headersSet };
}

describe("RenderizarCompartilhamentoLandingRota", () => {
  it("gera OG da home com imagem padrão", async () => {
    const rota = RenderizarCompartilhamentoLandingRota.criar("/site/share");
    const { req, res, next, headersSet } = makeReqRes();

    await rota.getHandler()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(headersSet["Cache-Control"]).toBe("private, no-store, must-revalidate");
    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("Tiago Fuguete");
    expect(html).toContain('property="og:image" content="https://tiagofuguete.com.br/images/seo/og-default.jpg"');
    expect(html).toContain('rel="canonical" href="https://tiagofuguete.com.br/"');
    expect(html).toContain("Pauper");
  });

  it("gera OG de sobre-mim", async () => {
    const rota = RenderizarCompartilhamentoLandingRota.criar();
    const { req, res, next } = makeReqRes("sobre-mim");

    await rota.getHandler()(req, res, next);

    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("Sobre mim | Tiago Fuguete");
    expect(html).toContain('href="https://tiagofuguete.com.br/sobre-mim"');
  });

  it("gera OG da lista de torneios", async () => {
    const rota = RenderizarCompartilhamentoLandingRota.criar();
    const { req, res, next } = makeReqRes("torneios");

    await rota.getHandler()(req, res, next);

    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("Torneios | Tiago Fuguete");
    expect(html).toContain('href="https://tiagofuguete.com.br/torneios"');
    expect(html).toContain("/images/seo/og-default.jpg");
  });
});
