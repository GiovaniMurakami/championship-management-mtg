import { RobotsTxtRota, SitemapXmlRota } from "../../../../../../src/infra/api/express/rotas/site/sitemap.express.route";

describe("SitemapXmlRota", () => {
  it("responde application/xml com urls", async () => {
    const caso = {
      executar: vi.fn().mockResolvedValue({
        baseUrl: "https://tiagofuguete.com.br",
        urls: [
          { loc: "https://tiagofuguete.com.br/", priority: "1.0", changefreq: "daily" },
          { loc: "https://tiagofuguete.com.br/torneios", priority: "0.9", changefreq: "hourly" },
        ],
      }),
    };
    const rota = SitemapXmlRota.criar(caso as any);
    const req = {
      headers: { "x-forwarded-host": "tiagofuguete.com.br" },
      hostname: "tiagofuguete.com.br",
    } as any;
    const headers: Record<string, string> = {};
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      set: vi.fn((k: string, v: string) => { headers[k] = v; return res; }),
    } as any;
    const next = vi.fn();

    await rota.getHandler()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(headers["Content-Type"]).toContain("application/xml");
    expect(res.status).toHaveBeenCalledWith(200);
    const xml = res.send.mock.calls[0][0] as string;
    expect(xml).toContain("https://tiagofuguete.com.br/torneios");
  });
});

describe("RobotsTxtRota", () => {
  it("aponta Sitemap para o host público", async () => {
    const rota = RobotsTxtRota.criar();
    const req = {
      headers: { "x-forwarded-host": "tiagofuguete.com.br" },
      hostname: "tiagofuguete.com.br",
    } as any;
    const headers: Record<string, string> = {};
    const res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      set: vi.fn((k: string, v: string) => { headers[k] = v; return res; }),
    } as any;

    await rota.getHandler()(req, res, vi.fn());

    expect(headers["Content-Type"]).toContain("text/plain");
    const body = res.send.mock.calls[0][0] as string;
    expect(body).toContain("Sitemap: https://tiagofuguete.com.br/sitemap.xml");
    expect(body).toContain("Disallow: /dashboard");
  });
});
