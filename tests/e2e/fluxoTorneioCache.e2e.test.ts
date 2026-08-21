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

import dotenv from "dotenv";
import supertest from "supertest";

dotenv.config();

const executar = process.env.RUN_TORNEIO_CACHE_E2E === "true";
const manterFixtures = process.env.E2E_KEEP_DATA === "true";
const permitirCacheCompartilhado = process.env.E2E_ALLOW_NONLOCAL_CACHE === "true";
const atrasoEntreEtapasMs = Math.max(0, Number(process.env.E2E_STEP_DELAY_MS) || 0);

const pausarParaAcompanhamento = async () => {
  if (atrasoEntreEtapasMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, atrasoEntreEtapasMs));
  }
};
if (executar) {
  process.env.DYNAMODB_CACHE_ENABLED = "true";
  process.env.LOG_LEVEL = "silent";
}

import { app } from "../../src/app";
import {
  cachePkTorneio,
  cacheSkPartidas,
  cacheSkStandings,
} from "../../src/helpers/cache/chavesCache";
import { CacheDynamoDbServico } from "../../src/infra/services/cacheDynamoDbServico";
import { criarRepositorios } from "../../src/composicao/repositorios";

type PartidaView = {
  id: string;
  jogador1Id: string;
  jogador2Id: string | null;
  rodada: number;
  status: string;
  vitoriasJogador1: number;
  vitoriasJogador2: number;
  confirmadoPor: string[];
  contestado: boolean;
  observacaoContestacao?: string | null;
};

type StandingView = {
  usuario: { id: string; nome: string };
  pontosMesa: number;
  dropped: boolean;
  droppedRodada: number | null;
  checkInRodada: number;
  deckId?: string | null;
  deckNome?: string | null;
};

const describeCloud = executar ? describe : describe.skip;

describeCloud("E2E - visao do cliente com cache durante o torneio", () => {
  jest.setTimeout(240_000);

  const prefix = `e2e_cache_flow_${Date.now()}_`;
  const senha = "Senha@12345";
  const cache = CacheDynamoDbServico.criar();
  const repositorios = criarRepositorios();
  const cachePk = () => cachePkTorneio(torneioId);
  const mainDeck = [{ nome: "Island", quantidade: 60 }];
  let req: ReturnType<typeof supertest>;

  let adminId = "";
  let adminToken = "";
  let torneioId = "";
  let iniciouFixtures = false;
  const jogadorIds: string[] = [];
  const jogadorTokens: string[] = [];

  const getStandings = async () => {
    const resposta = await req.get(`/torneio/${torneioId}/standings`).expect(200);
    return resposta.body.standings as StandingView[];
  };

  const getPartidas = async (rodada?: number) => {
    const query = rodada ? `?rodada=${rodada}` : "";
    const resposta = await req.get(`/torneio/${torneioId}/partidas${query}`).expect(200);
    return resposta.body.partidas as PartidaView[];
  };

  const esperarCacheAquecido = async (sk: string) => {
    await expect(cache.buscar(cachePk(), sk)).resolves.not.toBeNull();
  };

  beforeAll(async () => {
    const tabela = process.env.DYNAMODB_CACHE_TABLE ?? "";
    const tabelaDados = process.env.DYNAMODB_DATA_TABLE ?? "";
    if (!permitirCacheCompartilhado && !/(local|test)/i.test(tabela)) {
      throw new Error(
        `E2E bloqueado: use cache local/teste ou E2E_ALLOW_NONLOCAL_CACHE=true; recebido: ${tabela || "vazio"}`
      );
    }
    if (!/(local|test)/i.test(tabelaDados)) {
      throw new Error(
        `E2E bloqueado: DYNAMODB_DATA_TABLE deve apontar para tabela local/teste, recebido: ${tabelaDados || "vazio"}`
      );
    }
    req = supertest(app());
    iniciouFixtures = true;

    const admin = await req
      .post("/usuario/cadastrar")
      .send({ nome: "Organizador Cache E2E", email: `${prefix}org@test.com`, senha })
      .expect(201);
    adminId = admin.body.id;
    const usuarioAdmin = await repositorios.usuario.buscarPorId(adminId);
    if (!usuarioAdmin) throw new Error("Usuario administrador do E2E nao encontrado");
    usuarioAdmin.role = "admin";
    await repositorios.usuario.atualizar(usuarioAdmin);

    const loginAdmin = await req
      .post("/usuario/login")
      .send({ email: `${prefix}org@test.com`, senha })
      .expect(200);
    adminToken = loginAdmin.body.token;

    for (let indice = 0; indice < 4; indice += 1) {
      const email = `${prefix}jogador${indice}@test.com`;
      const cadastro = await req
        .post("/usuario/cadastrar")
        .send({ nome: `Jogador Cache ${indice}`, email, senha })
        .expect(201);
      jogadorIds.push(cadastro.body.id);

      const login = await req.post("/usuario/login").send({ email, senha }).expect(200);
      jogadorTokens.push(login.body.token);
      await req
        .put("/usuario/atualizar")
        .set("Authorization", `Bearer ${login.body.token}`)
        .send({ nickMTGO: `cacheplayer${indice}` })
        .expect(200);
    }

    const torneio = await req
      .post("/torneio/criar")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        nome: `${prefix}Torneio`,
        horario: new Date(Date.now() + 3_600_000).toISOString(),
        formato: "Standard",
        maxJogadores: 8,
        maxRodadas: 2,
        exibirNomeJogador: "nickMOL",
      })
      .expect(201);
    torneioId = torneio.body.id;
    console.info(`[E2E cache] torneioId=${torneioId} fase=inscricoes`);
    await pausarParaAcompanhamento();
  }, 120_000);

  afterAll(async () => {
    if (!iniciouFixtures) return;
    if (manterFixtures) {
      console.info(`[E2E cache] fixtures preservadas torneioId=${torneioId}`);
      return;
    }
    try {
      if (torneioId) {
        await cache.invalidarParticao(cachePk());
        const partidas = await repositorios.partida.listarPorTorneio(torneioId);
        await repositorios.partida.excluirPorIds(partidas.map((partida) => partida.id));
        const inscricoes = await repositorios.inscricao.listarPorTorneio(torneioId);
        await Promise.all(inscricoes.map((inscricao) => repositorios.inscricao.excluir(inscricao.id)));
        await repositorios.torneio.excluir(torneioId);
      }
      const usuarios = [adminId, ...jogadorIds].filter(Boolean);
      await Promise.all(usuarios.map((usuarioId) => repositorios.deck.excluirPorUsuario(usuarioId)));
      await Promise.all(usuarios.map((usuarioId) => repositorios.usuario.excluir(usuarioId)));
    } finally {
      await cache.invalidarParticao(cachePk());
    }
  }, 120_000);

  it("nunca devolve standings ou partidas anteriores depois das mutacoes", async () => {
    expect(await getStandings()).toHaveLength(0);
    await esperarCacheAquecido(cacheSkStandings());

    for (let indice = 0; indice < jogadorIds.length; indice += 1) {
      await req
        .post(`/torneio/${torneioId}/inscrever`)
        .set("Authorization", `Bearer ${jogadorTokens[indice]}`)
        .expect(201);

      const standings = await getStandings();
      expect(standings).toHaveLength(indice + 1);
      expect(standings.map((item) => item.usuario.id)).toContain(jogadorIds[indice]);
      await esperarCacheAquecido(cacheSkStandings());

      const deck = await req
        .post("/deck/cadastrar")
        .set("Authorization", `Bearer ${jogadorTokens[indice]}`)
        .send({ nome: `${prefix}Deck ${indice}`, formato: "Standard", maindeck: mainDeck, sideboard: [] })
        .expect(201);
      const escolhaDeck = await req
        .post(`/torneio/${torneioId}/deck`)
        .set("Authorization", `Bearer ${jogadorTokens[indice]}`)
        .send({ deckId: deck.body.id })
        .expect(200);
      const standingComDeck = (await getStandings()).find(
        (item) => item.usuario.id === jogadorIds[indice]
      )!;
      expect(standingComDeck.deckId).toBe(escolhaDeck.body.deckId);
      expect(standingComDeck.deckNome).toBe(`${prefix}Deck ${indice}`);

      await req
        .post(`/torneio/${torneioId}/checkin`)
        .set("Authorization", `Bearer ${jogadorTokens[indice]}`)
        .expect(200);
      const standingComCheckin = (await getStandings()).find(
        (item) => item.usuario.id === jogadorIds[indice]
      )!;
      expect(standingComCheckin.checkInRodada).toBe(0);
    }

    await getStandings();
    await getPartidas();
    await esperarCacheAquecido(cacheSkStandings());
    await esperarCacheAquecido(cacheSkPartidas());

    await req
      .post(`/torneio/${torneioId}/iniciar`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const torneioRodada1 = await req.get(`/torneio/${torneioId}`).expect(200);
    expect(torneioRodada1.body.rodadaAtual).toBe(1);
    expect(torneioRodada1.body.status).toBe("em_andamento");
    let partidas = await getPartidas(1);
    expect(partidas).toHaveLength(2);
    expect(partidas.every((partida) => partida.status === "pendente")).toBe(true);

    const primeira = partidas[0];
    await getStandings();
    await getPartidas(1);
    await req
      .post(`/torneio/partida/${primeira.id}/resultado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
      .expect(200);

    partidas = await getPartidas(1);
    const primeiraAtualizada = partidas.find((partida) => partida.id === primeira.id)!;
    expect(primeiraAtualizada.status).toBe("finalizada");
    expect(primeiraAtualizada.vitoriasJogador1).toBe(2);
    const standingsComResultado = await getStandings();
    expect(standingsComResultado.find((item) => item.usuario.id === primeira.jogador1Id)?.pontosMesa).toBe(0);

    if (primeira.jogador2Id) {
      const tokenJ1 = jogadorTokens[jogadorIds.indexOf(primeira.jogador1Id)];
      const tokenJ2 = jogadorTokens[jogadorIds.indexOf(primeira.jogador2Id)];
      await req.post(`/torneio/partida/${primeira.id}/confirmar`).set("Authorization", `Bearer ${tokenJ1}`).expect(200);
      await req.post(`/torneio/partida/${primeira.id}/confirmar`).set("Authorization", `Bearer ${tokenJ2}`).expect(200);
      const confirmada = (await getPartidas(1)).find((partida) => partida.id === primeira.id)!;
      expect(confirmada.confirmadoPor).toEqual(expect.arrayContaining([primeira.jogador1Id, primeira.jogador2Id]));
    }

    const segunda = partidas[1];
    await req
      .post(`/torneio/partida/${segunda.id}/resultado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ vitoriasJogador1: 2, vitoriasJogador2: 1 })
      .expect(200);
    const tokenContestador = jogadorTokens[jogadorIds.indexOf(segunda.jogador1Id)];
    await getPartidas(1);
    await req
      .post(`/torneio/partida/${segunda.id}/contestar`)
      .set("Authorization", `Bearer ${tokenContestador}`)
      .send({ observacao: "Placar informado incorretamente" })
      .expect(200);
    let segundaAtualizada = (await getPartidas(1)).find((partida) => partida.id === segunda.id)!;
    expect(segundaAtualizada.contestado).toBe(true);
    expect(segundaAtualizada.observacaoContestacao).toBe("Placar informado incorretamente");

    await req
      .put(`/torneio/partida/${segunda.id}/ajustar`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ vitoriasJogador1: 1, vitoriasJogador2: 2 })
      .expect(200);
    segundaAtualizada = (await getPartidas(1)).find((partida) => partida.id === segunda.id)!;
    expect(segundaAtualizada.contestado).toBe(false);
    expect(segundaAtualizada.vitoriasJogador1).toBe(1);
    expect(segundaAtualizada.vitoriasJogador2).toBe(2);

    for (const token of jogadorTokens) {
      await req.post(`/torneio/${torneioId}/checkin`).set("Authorization", `Bearer ${token}`).expect(200);
    }
    await getStandings();
    await getPartidas();
    const proxima = await req
      .post(`/torneio/${torneioId}/proxima-rodada`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(proxima.body.rodadaAtual).toBe(2);
    console.info(`[E2E cache] torneioId=${torneioId} fase=rodada rodada=2`);
    await pausarParaAcompanhamento();

    const standingsRodada2 = await getStandings();
    expect(standingsRodada2.find((item) => item.usuario.id === primeira.jogador1Id)?.pontosMesa).toBe(3);

    const partidasRodada2 = await getPartidas(2);
    expect(partidasRodada2).toHaveLength(2);
    expect((await req.get(`/torneio/${torneioId}`).expect(200)).body.rodadaAtual).toBe(2);

    const jogadorDropado = partidasRodada2[0].jogador1Id;
    await getStandings();
    await getPartidas(2);
    await req
      .post(`/torneio/${torneioId}/drop`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ jogadorId: jogadorDropado })
      .expect(200);

    let standings = await getStandings();
    const dropado = standings.find((item) => item.usuario.id === jogadorDropado)!;
    expect(dropado.dropped).toBe(true);
    expect(dropado.droppedRodada).toBe(2);
    let partidaDrop = (await getPartidas(2)).find(
      (partida) => partida.jogador1Id === jogadorDropado || partida.jogador2Id === jogadorDropado
    )!;
    expect(partidaDrop.status).toBe("finalizada");

    await req
      .post(`/torneio/${torneioId}/undrop`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ jogadorId: jogadorDropado })
      .expect(200);
    standings = await getStandings();
    expect(standings.find((item) => item.usuario.id === jogadorDropado)?.dropped).toBe(false);
    partidaDrop = (await getPartidas(2)).find((partida) => partida.id === partidaDrop.id)!;
    expect(partidaDrop.status).toBe("pendente");
    expect(partidaDrop.vitoriasJogador1 + partidaDrop.vitoriasJogador2).toBe(0);

    for (const partida of await getPartidas(2)) {
      await req
        .post(`/torneio/partida/${partida.id}/resultado`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
        .expect(200);
    }

    await getStandings();
    await req
      .post(`/torneio/${torneioId}/encerrar`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const visaoFinal = await req.get(`/torneio/${torneioId}`).expect(200);
    expect(visaoFinal.body.status).toBe("finalizado");
    console.info(`[E2E cache] torneioId=${torneioId} fase=finalizado`);
    await pausarParaAcompanhamento();
    const standingsFinais = await getStandings();
    expect(standingsFinais).toHaveLength(4);
    expect(standingsFinais.every((item) => !item.dropped)).toBe(true);
  });
});
