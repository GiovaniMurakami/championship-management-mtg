import { ProxyImagemRota } from "../../../../../../src/infra/api/express/rotas/imagem/proxyImagem.express.route";

function makeReqRes(query: Record<string, unknown> = {}) {
  const req = { query } as any;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  } as any;
  const next = jest.fn();
  return { req, res, next };
}

describe("ProxyImagemRota", () => {
  const rota = ProxyImagemRota.criar();
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_S3_BUCKET = "meu-bucket";
    process.env.AWS_S3_REGION = "us-east-1";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_S3_REGION;
  });

  it("registra GET /imagem/proxy", () => {
    expect(rota.getCaminho()).toBe("/imagem/proxy");
    expect(rota.getMetodo()).toBe("get");
  });

  it("rejeita URL fora do bucket", async () => {
    const { req, res, next } = makeReqRes({
      url: "https://outro-bucket.s3.us-east-1.amazonaws.com/img.jpg",
    });
    await rota.getHandler()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(global.fetch).toBe(originalFetch);
  });

  it("proxy de imagem do bucket autorizado", async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => (h === "content-type" ? "image/jpeg" : null) },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    }) as any;

    const url = "https://meu-bucket.s3.us-east-1.amazonaws.com/imagens/a.jpeg";
    const { req, res, next } = makeReqRes({ url });
    await rota.getHandler()(req, res, next);

    expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining({ method: "GET" }));
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/jpeg");
    expect(res.setHeader).toHaveBeenCalledWith("Cross-Origin-Resource-Policy", "cross-origin");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
