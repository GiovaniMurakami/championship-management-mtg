/**
 * E2E: dois torneios separados — um publica a rodada na hora, o outro só depois de POST /publicar-rodada.
 *
 * Execução: npm run test:e2e:publicar-rodada
 */

jest.mock("../../src/middlewares/express/rateLimiter", () => {
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

jest.mock("../../src/infra/ably/notificacaoAbly", () => ({
  NotificacaoAbly: { iniciar: jest.fn() },
}));

jest.mock("../../src/infra/services/emailServico", () => ({
  EmailServico: {
    criar: () => ({ enviar: jest.fn().mockResolvedValue(undefined) }),
  },
}));

import dotenv from "dotenv";
import supertest from "supertest";

dotenv.config();

process.env.PORT = "0";
process.env.LOG_LEVEL = "silent";

import { app } from "../../src/app";
import { criarRepositorios } from "../../src/composicao/repositorios";

const executar = process.env.RUN_TORNEIO_PUBLICAR_E2E === "true";
const manterFixtures = process.env.E2E_KEEP_DATA === "true";
const describeCloud = executar ? describe : describe.skip;
const repositorios = criarRepositorios();
const senha = "Senha@12345";
const mainDeck = [{ nome: "Mountain", quantidade: 60 }];

type PartidaView = {
  id: string;
  rodada: number;
  status: string;
  jogador1Id: string;
  jogador2Id: string | null;
};

describeCloud("E2E - publicar rodada com e sem atraso", () => {
  jest.setTimeout(180_000);

  const prefix = `e2e_pub_${Date.now()}_`;
  let req: ReturnType<typeof supertest>;
  let iniciouFixtures = false;
  let adminId = "";
  let adminToken = "";
  let torneioImediatoId = "";
  let torneioAtrasadoId = "";
  const jogadorIds: string[] = [];
  const jogadorTokens: string[] = [];

  const authAdmin = () => ({ Authorization: `Bearer ${adminToken}` });
  const authJogador = (indice = 0) => ({ Authorization: `Bearer ${jogadorTokens[indice]}` });

  const criarTorneio = async (nome: string) => {
    const resposta = await req
      .post("/torneio/criar")
      .set(authAdmin())
      .send({
        nome: `${prefix}${nome}`,
        horario: new Date(Date.now() + 3_600_000).toISOString(),
        formato: "Standard",
        maxJogadores: 8,
        maxRodadas: 2,
      })
      .expect(201);
    return resposta.body.id as string;
  };

  const inscreverElenco = async (torneioId: string) => {
    for (let indice = 0; indice < jogadorIds.length; indice += 1) {
      await req.post(`/torneio/${torneioId}/inscrever`).set(authJogador(indice)).expect(201);
      const deck = await req
        .post("/deck/cadastrar")
        .set(authJogador(indice))
        .send({ nome: `${prefix}${torneioId.slice(0, 8)} Deck ${indice}`, formato: "Standard", maindeck: mainDeck, sideboard: [] })
        .expect(201);
      await req.post(`/torneio/${torneioId}/deck`).set(authJogador(indice)).send({ deckId: deck.body.id }).expect(200);
      await req.post(`/torneio/${torneioId}/checkin`).set(authJogador(indice)).expect(200);
    }
  };

  const listarPartidas = async (torneioId: string, token?: string, rodada = 1) => {
    const chamada = req.get(`/torneio/${torneioId}/partidas?rodada=${rodada}`);
    if (token) chamada.set("Authorization", `Bearer ${token}`);
    const resposta = await chamada.expect(200);
    return resposta.body.partidas as PartidaView[];
  };

  const finalizarRodada = async (torneioId: string, partidas: PartidaView[]) => {
    for (const partida of partidas) {
      if (!partida.jogador2Id) continue;
      await req
        .post(`/torneio/partida/${partida.id}/resultado`)
        .set(authAdmin())
        .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
        .expect(200);
    }
  };

  beforeAll(async () => {
    const tabela = process.env.DYNAMODB_DATA_TABLE ?? "";
    if (!/(local|test)/i.test(tabela)) {
      throw new Error(
        `E2E bloqueado: DYNAMODB_DATA_TABLE deve apontar para tabela local/teste, recebido: ${tabela || "vazio"}`
      );
    }

    req = supertest(app());
    iniciouFixtures = true;

    const admin = await req
      .post("/usuario/cadastrar")
      .send({ nome: "Organizador Publicar E2E", email: `${prefix}org@test.com`, senha })
      .expect(201);
    adminId = admin.body.id;
    const usuarioAdmin = await repositorios.usuario.buscarPorId(adminId);
    if (!usuarioAdmin) throw new Error("Usuario administrador do E2E nao encontrado");
    usuarioAdmin.role = "admin";
    await repositorios.usuario.atualizar(usuarioAdmin);
    adminToken = (await req.post("/usuario/login").send({ email: `${prefix}org@test.com`, senha }).expect(200)).body.token;

    for (let indice = 0; indice < 4; indice += 1) {
      const email = `${prefix}jogador${indice}@test.com`;
      const cadastro = await req.post("/usuario/cadastrar").send({ nome: `Jogador Pub ${indice}`, email, senha }).expect(201);
      jogadorIds.push(cadastro.body.id);
      const tokenJogador = (await req.post("/usuario/login").send({ email, senha }).expect(200)).body.token;
      jogadorTokens.push(tokenJogador);
      await req.put("/usuario/atualizar").set({ Authorization: `Bearer ${tokenJogador}` }).send({ nickMTGO: `pubplayer${indice}` }).expect(200);
    }

    torneioImediatoId = await criarTorneio("Imediato");
    torneioAtrasadoId = await criarTorneio("Atrasado");
    await inscreverElenco(torneioImediatoId);
    await inscreverElenco(torneioAtrasadoId);
    console.info(`[E2E publicar] imediato=${torneioImediatoId} atrasado=${torneioAtrasadoId}`);
  }, 120_000);

  afterAll(async () => {
    if (!iniciouFixtures || manterFixtures) return;
    for (const torneioId of [torneioImediatoId, torneioAtrasadoId].filter(Boolean)) {
      const partidas = await repositorios.partida.listarPorTorneio(torneioId);
      await repositorios.partida.excluirPorIds(partidas.map((partida) => partida.id));
      const inscricoes = await repositorios.inscricao.listarPorTorneio(torneioId);
      await Promise.all(inscricoes.map((inscricao) => repositorios.inscricao.excluir(inscricao.id)));
      await repositorios.torneio.excluir(torneioId);
    }
    const usuarios = [adminId, ...jogadorIds].filter(Boolean);
    await Promise.all(usuarios.map((usuarioId) => repositorios.deck.excluirPorUsuario(usuarioId)));
    await Promise.all(usuarios.map((usuarioId) => repositorios.usuario.excluir(usuarioId)));
  }, 120_000);

  it("publica as mesas na hora ao iniciar e ao avançar (default)", async () => {
    const inicio = await req.post(`/torneio/${torneioImediatoId}/iniciar`).set(authAdmin()).expect(200);
    expect(inicio.body.rodadaPublicada).toBe(true);
    expect(inicio.body.partidas).toHaveLength(2);

    const visaoJogador = await req.get(`/torneio/${torneioImediatoId}`).set(authJogador()).expect(200);
    expect(visaoJogador.body.rodadaPublicada).toBe(true);
    expect(visaoJogador.body.partidas.filter((partida: PartidaView) => partida.rodada === 1)).toHaveLength(2);

    const partidasJogador = await listarPartidas(torneioImediatoId, jogadorTokens[0], 1);
    expect(partidasJogador).toHaveLength(2);

    await finalizarRodada(torneioImediatoId, partidasJogador);

    const proxima = await req.post(`/torneio/${torneioImediatoId}/proxima-rodada`).set(authAdmin()).expect(200);
    expect(proxima.body.rodadaPublicada).toBe(true);
    expect(proxima.body.rodadaAtual).toBe(2);
    expect(await listarPartidas(torneioImediatoId, jogadorTokens[0], 2)).toHaveLength(2);
  });

  it("esconde as mesas até o organizador publicar, em torneio separado", async () => {
    const inicio = await req
      .post(`/torneio/${torneioAtrasadoId}/iniciar`)
      .set(authAdmin())
      .send({ publicar: false })
      .expect(200);
    expect(inicio.body.rodadaPublicada).toBe(false);
    expect(inicio.body.partidas).toHaveLength(2);

    const visaoAdmin = await req.get(`/torneio/${torneioAtrasadoId}`).set(authAdmin()).expect(200);
    expect(visaoAdmin.body.rodadaPublicada).toBe(false);
    expect(visaoAdmin.body.partidas.filter((partida: PartidaView) => partida.rodada === 1)).toHaveLength(2);

    const visaoJogador = await req.get(`/torneio/${torneioAtrasadoId}`).set(authJogador()).expect(200);
    expect(visaoJogador.body.rodadaPublicada).toBe(false);
    expect(visaoJogador.body.partidas.filter((partida: PartidaView) => partida.rodada === 1)).toHaveLength(0);

    expect(await listarPartidas(torneioAtrasadoId, jogadorTokens[0], 1)).toHaveLength(0);
    const partidasAdmin = await listarPartidas(torneioAtrasadoId, adminToken, 1);
    expect(partidasAdmin).toHaveLength(2);

    const recusarResultado = await req
      .post(`/torneio/partida/${partidasAdmin[0].id}/resultado`)
      .set(authAdmin())
      .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
      .expect(400);
    expect(recusarResultado.body.mensagem).toMatch(/ainda não foi publicada/i);

    const recusarAvanco = await req.post(`/torneio/${torneioAtrasadoId}/proxima-rodada`).set(authAdmin()).expect(400);
    expect(recusarAvanco.body.mensagem).toMatch(/publique a rodada atual/i);

    const publicado = await req.post(`/torneio/${torneioAtrasadoId}/publicar-rodada`).set(authAdmin()).expect(200);
    expect(publicado.body.rodadaPublicada).toBe(true);
    expect(publicado.body.partidas).toHaveLength(2);

    expect(await listarPartidas(torneioAtrasadoId, jogadorTokens[0], 1)).toHaveLength(2);
    const visaoAposPublicar = await req.get(`/torneio/${torneioAtrasadoId}`).set(authJogador()).expect(200);
    expect(visaoAposPublicar.body.rodadaPublicada).toBe(true);

    await finalizarRodada(torneioAtrasadoId, partidasAdmin);

    const proxima = await req
      .post(`/torneio/${torneioAtrasadoId}/proxima-rodada`)
      .set(authAdmin())
      .send({ publicar: false })
      .expect(200);
    expect(proxima.body.rodadaPublicada).toBe(false);
    expect(proxima.body.rodadaAtual).toBe(2);
    expect(await listarPartidas(torneioAtrasadoId, jogadorTokens[0], 2)).toHaveLength(0);
    expect(await listarPartidas(torneioAtrasadoId, adminToken, 2)).toHaveLength(2);

    await req.post(`/torneio/${torneioAtrasadoId}/publicar-rodada`).set(authAdmin()).expect(200);
    expect(await listarPartidas(torneioAtrasadoId, jogadorTokens[0], 2)).toHaveLength(2);
  });
});
