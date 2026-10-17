/**
 * E2E: login seta cookie HttpOnly de refresh; refresh sem body renova access.
 *
 * Execução: npm run test:e2e:auth-cookie
 */

vi.mock("../../src/middlewares/express/rateLimiter", () => {
  const passthrough = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    authRateLimiter: passthrough,
    refreshTokenRateLimiter: passthrough,
    accountRateLimiter: passthrough,
    deckRateLimiter: passthrough,
    inscricaoRateLimiter: passthrough,
    resultadoRateLimiter: passthrough,
    mutationRateLimiter: passthrough,
    torneioMutationRateLimiter: passthrough,
    publicReadRateLimiter: passthrough,
    torneioReadRateLimiter: passthrough,
    heavyReadRateLimiter: passthrough,
    publicActionRateLimiter: passthrough,
    uploadImagemRateLimiter: passthrough,
  };
});

vi.mock("../../src/infra/ably/notificacaoAbly", () => ({
  NotificacaoAbly: { iniciar: vi.fn() },
}));

vi.mock("../../src/infra/services/emailServico", () => ({
  EmailServico: {
    criar: () => ({ enviar: vi.fn().mockResolvedValue(undefined) }),
  },
}));

import dotenv from "dotenv";
import supertest from "supertest";

dotenv.config();

process.env.PORT = "0";
process.env.LOG_LEVEL = "silent";

import { app } from "../../src/app";
import { criarRepositorios } from "../../src/composicao/repositorios";
import { REFRESH_COOKIE_NAME } from "../../src/helpers/auth/refreshCookie";

const executar = process.env.RUN_AUTH_COOKIE_E2E === "true";
const manterFixtures = process.env.E2E_KEEP_DATA === "true";
const describeCloud = executar ? describe : describe.skip;
const repositorios = criarRepositorios();
const senha = "Senha@12345";

describeCloud("E2E - refresh cookie HttpOnly", () => {
  vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

  const prefix = `e2e_auth_${Date.now()}_`;
  let agent: ReturnType<typeof supertest.agent>;
  let usuarioId = "";

  beforeAll(async () => {
    const tabela = process.env.DYNAMODB_DATA_TABLE ?? "";
    if (!/(local|test)/i.test(tabela)) {
      throw new Error(
        `E2E bloqueado: DYNAMODB_DATA_TABLE deve apontar para tabela local/teste, recebido: ${tabela || "vazio"}`,
      );
    }
    agent = supertest.agent(app());
  });

  afterAll(async () => {
    if (manterFixtures || !usuarioId) return;
    try {
      await repositorios.usuario.excluir?.(usuarioId);
    } catch {
      /* best-effort */
    }
  });

  it("login seta cookie, refresh sem body devolve access e logout limpa cookie", async () => {
    const email = `${prefix}user@test.com`;
    const cadastro = await agent.post("/usuario/cadastrar").send({
      nome: `${prefix}User`,
      email,
      senha,
    });
    expect(cadastro.status).toBe(201);
    usuarioId = cadastro.body.id;

    const login = await agent.post("/usuario/login").send({ email, senha });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.refreshToken).toBeUndefined();
    expect(login.body.usuario?.email).toBe(email);

    const setCookie = login.headers["set-cookie"];
    expect(setCookie).toBeTruthy();
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
    expect(cookieHeader).toContain(`${REFRESH_COOKIE_NAME}=`);
    expect(cookieHeader.toLowerCase()).toContain("httponly");

    const refresh = await agent.post("/usuario/refresh-token").send({});
    expect(refresh.status).toBe(200);
    expect(refresh.body.token).toBeTruthy();
    expect(refresh.body.refreshToken).toBeUndefined();

    const logout = await agent
      .post("/usuario/logout")
      .set("Authorization", `Bearer ${refresh.body.token}`)
      .send({});
    expect(logout.status).toBe(200);

    const refreshAposLogout = await agent.post("/usuario/refresh-token").send({});
    expect(refreshAposLogout.status).toBe(401);
  });
});
