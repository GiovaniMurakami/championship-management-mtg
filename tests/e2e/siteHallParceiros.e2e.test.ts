/**
 * E2E: textos de /parceiros + Hall da Fama (CRUD + ordenação por dataTorneio).
 *
 * Execução: npm run test:e2e:site-hall
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
import { getS3BaseUrl } from "../../src/helpers/env";

const executar = process.env.RUN_SITE_HALL_E2E === "true";
const manterFixtures = process.env.E2E_KEEP_DATA === "true";
const describeCloud = executar ? describe : describe.skip;
const repositorios = criarRepositorios();
const senha = "Senha@12345";
const s3Base = getS3BaseUrl() || "https://bucket.s3.amazonaws.com";
const img = (nome: string) => `${s3Base}/imagens/${nome}`;

describeCloud("E2E - site parceiros e Hall da Fama", () => {
  vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

  const prefix = `e2e_site_${Date.now()}_`;
  let req: ReturnType<typeof supertest>;
  let adminId = "";
  let adminToken = "";
  let torneioId = "";
  let hallId = "";
  let parceirosAntes: unknown = null;

  const authAdmin = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    const tabela = process.env.DYNAMODB_DATA_TABLE ?? "";
    if (!/(local|test)/i.test(tabela)) {
      throw new Error(
        `E2E bloqueado: DYNAMODB_DATA_TABLE deve apontar para tabela local/teste, recebido: ${tabela || "vazio"}`,
      );
    }

    req = supertest(app());

    const email = `${prefix}admin@example.com`;
    const cadastro = await req.post("/usuario/cadastrar").send({
      nome: `${prefix}Admin`,
      email,
      senha,
    });
    if (cadastro.status !== 201) {
      throw new Error(`POST /usuario/cadastrar falhou: ${cadastro.status} ${JSON.stringify(cadastro.body)}`);
    }
    adminId = cadastro.body.id;

    const usuario = await repositorios.usuario.buscarPorId(adminId);
    if (!usuario) throw new Error("Admin E2E não encontrado");
    usuario.role = "admin";
    await repositorios.usuario.atualizar(usuario);

    adminToken = (await req.post("/usuario/login").send({ email, senha }).expect(200)).body.token;

    const torneio = await req
      .post("/torneio/criar")
      .set(authAdmin())
      .send({
        nome: `${prefix}Hall`,
        formato: "Pauper",
        horario: new Date("2026-10-10T20:00:00.000Z").toISOString(),
        maxRodadas: 3,
        maxJogadores: 8,
      })
      .expect(201);
    torneioId = torneio.body.id;

    const parceiros = await req.get("/site/parceiros/admin").set(authAdmin());
    if (parceiros.status === 200) {
      parceirosAntes = parceiros.body;
    }
  }, 120_000);

  afterAll(async () => {
    if (manterFixtures) return;
    try {
      if (hallId) {
        await req.delete(`/hall-da-fama/${hallId}`).set(authAdmin());
      }
      if (parceirosAntes) {
        await req.put("/site/parceiros").set(authAdmin()).send({
          parceiros: (parceirosAntes as { parceiros?: unknown[] }).parceiros || [],
          cupomGlobal: (parceirosAntes as { cupomGlobal?: string }).cupomGlobal || "",
          paginaTitulo: (parceirosAntes as { paginaTitulo?: string }).paginaTitulo || "",
          paginaTexto: (parceirosAntes as { paginaTexto?: string }).paginaTexto || "",
          ctaTitulo: (parceirosAntes as { ctaTitulo?: string }).ctaTitulo || "",
          ctaTexto: (parceirosAntes as { ctaTexto?: string }).ctaTexto || "",
          contatoEmail: (parceirosAntes as { contatoEmail?: string }).contatoEmail || "",
        });
      }
      if (torneioId) {
        await repositorios.torneio.excluir?.(torneioId);
      }
      if (adminId) {
        await repositorios.usuario.excluir?.(adminId);
      }
    } catch {
      /* cleanup best-effort */
    }
  });

  it("salva textos de parceiros e devolve no GET público", async () => {
    const payload = {
      parceiros: [
        {
          nome: `${prefix}Loja`,
          logoUrl: img("parceiro-e2e.webp"),
          linkUrl: "https://loja.example",
          ativo: true,
        },
      ],
      cupomGlobal: "FUGUETE05",
      paginaTitulo: `${prefix}Título parceiros`,
      paginaTexto: `${prefix}Texto parceiros`,
      ctaTitulo: `${prefix}CTA`,
      ctaTexto: `${prefix}Texto CTA`,
      contatoEmail: "contato@tiagofuguete.com.br",
    };

    const put = await req.put("/site/parceiros").set(authAdmin()).send(payload);
    expect(put.status).toBe(200);
    expect(put.body.paginaTitulo).toBe(payload.paginaTitulo);

    const get = await req.get("/site/parceiros");
    expect(get.status).toBe(200);
    expect(get.body.paginaTitulo).toBe(payload.paginaTitulo);
    expect(get.body.paginaTexto).toBe(payload.paginaTexto);
    expect(get.body.contatoEmail).toBe(payload.contatoEmail);
    expect(get.body.parceiros.some((p: { nome: string }) => p.nome === payload.parceiros[0].nome)).toBe(true);
  });

  it("cadastra item no Hall e lista com dataTorneio", async () => {
    const post = await req
      .post("/hall-da-fama")
      .set(authAdmin())
      .send({
        torneioId,
        imagemUrl: img("top8-e2e.webp"),
        torneioNome: `${prefix}Hall`,
      });
    expect(post.status).toBe(201);
    hallId = post.body.id;
    expect(post.body.dataTorneio).toBeTruthy();

    const patch = await req
      .patch(`/hall-da-fama/${hallId}`)
      .set(authAdmin())
      .send({ dataTorneio: "2026-10-10T20:00:00.000Z" });
    expect(patch.status).toBe(200);
    expect(patch.body.dataTorneio).toContain("2026-10-10");

    const lista = await req.get("/hall-da-fama?limite=100&offset=0");
    expect(lista.status).toBe(200);
    const item = (lista.body.itens || []).find((i: { id: string }) => i.id === hallId);
    expect(item).toBeTruthy();
    expect(item.torneioNome).toContain("Hall");
    expect(item.dataTorneio).toBeTruthy();
  });
});
