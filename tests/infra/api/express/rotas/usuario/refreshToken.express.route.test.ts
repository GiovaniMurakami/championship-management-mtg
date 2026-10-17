import { RefreshTokenRota } from "../../../../../../src/infra/api/express/rotas/usuario/refreshToken.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";

function makeReqRes(
  body: Record<string, unknown> = {},
  cookies: Record<string, string> = {},
) {
  const req = { body, cookies, headers: {} } as any;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  } as any;
  const next = vi.fn();
  return { req, res, next };
}

describe("RefreshTokenRota", () => {
  const servico = { executar: vi.fn() } as any;
  const rota = RefreshTokenRota.criar(servico);

  beforeEach(() => vi.clearAllMocks());

  it("renova via cookie HttpOnly sem body", async () => {
    servico.executar.mockResolvedValue({ token: "access-new", refreshToken: "refresh-new" });
    const { req, res, next } = makeReqRes({}, { cmmtg_rt: "refresh-old" });

    await rota.getHandler()(req, res, next);

    expect(servico.executar).toHaveBeenCalledWith({ refreshToken: "refresh-old" });
    expect(res.cookie).toHaveBeenCalledWith(
      "cmmtg_rt",
      "refresh-new",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.json).toHaveBeenCalledWith({ token: "access-new" });
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("refreshToken");
  });

  it("aceita refresh legado no body quando não há cookie", async () => {
    servico.executar.mockResolvedValue({ token: "access-new", refreshToken: "refresh-new" });
    const { req, res, next } = makeReqRes({ refreshToken: "refresh-legacy" }, {});

    await rota.getHandler()(req, res, next);

    expect(servico.executar).toHaveBeenCalledWith({ refreshToken: "refresh-legacy" });
    expect(res.status).not.toHaveBeenCalledWith(401);
  });

  it("prefers cookie over body", async () => {
    servico.executar.mockResolvedValue({ token: "a", refreshToken: "b" });
    const { req, res, next } = makeReqRes(
      { refreshToken: "from-body" },
      { cmmtg_rt: "from-cookie" },
    );

    await rota.getHandler()(req, res, next);

    expect(servico.executar).toHaveBeenCalledWith({ refreshToken: "from-cookie" });
  });

  it("retorna 401 e limpa cookie quando não há refresh", async () => {
    const { req, res, next } = makeReqRes({}, {});

    await rota.getHandler()(req, res, next);

    expect(servico.executar).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.clearCookie).toHaveBeenCalled();
  });

  it("limpa cookie quando refresh é inválido", async () => {
    servico.executar.mockRejectedValue(
      ErroPersonalizado.criar({
        mensagem: "Refresh token inválido ou expirado.",
        status: StatusErro.erroNaoAutorizado,
      }),
    );
    const { req, res, next } = makeReqRes({}, { cmmtg_rt: "expired" });

    await rota.getHandler()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.clearCookie).toHaveBeenCalled();
  });
});
