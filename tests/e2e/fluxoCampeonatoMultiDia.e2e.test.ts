/**
 * E2E: Campeonato Swiss multi-dia (Day 1 → pausado → Day 2) com personas mapeadas.
 *
 * - 8 jogadores + 1 organizador admin
 * - rodadasDay1=2, vagasDay2=4, maxRodadas=4
 * - Pareamentos forçados para vitória / empate / contestação determinísticos
 * - Personas: tests/e2e/support/personasCampeonato.ts
 *
 * Execução: npm run test:e2e:campeonato-multidia
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
import {
  CHAVES_CORTE,
  CHAVES_DAY2,
  CONFIG_TORNEIO_MULTIDIA,
  PERSONA_ORG,
  PERSONAS_JOGADORES,
  PONTOS_ESPERADOS,
  ROTEIRO_RODADAS,
  placarDoPareamento,
  type PareamentoRoteiro,
  type PersonaDef,
} from "./support/personasCampeonato";

const executar = process.env.RUN_CAMPEONATO_MULTIDIA_E2E === "true";
const manterFixtures = process.env.E2E_KEEP_DATA === "true";
const atrasoEntreEtapasMs = Math.max(0, Number(process.env.E2E_STEP_DELAY_MS) || 0);
const describeCloud = executar ? describe : describe.skip;

const repositorios = criarRepositorios();
const SENHA = "Senha@12345";
const MAINDECK = [{ nome: "Island", quantidade: 60 }];

type PartidaView = {
  id: string;
  rodada: number;
  jogador1Id: string;
  jogador2Id: string | null;
  status: string;
  vitoriasJogador1: number;
  vitoriasJogador2: number;
  confirmadoPor?: string[];
  contestado?: boolean;
  observacaoContestacao?: string | null;
  mesa?: number | null;
};

type StandingView = {
  usuario: { id: string; nome: string };
  pontosMesa: number;
  dropped: boolean;
  droppedRodada: number | null;
};

type PersonaRuntime = PersonaDef & {
  id: string;
  token: string;
  email: string;
};

async function pausarParaAcompanhamento(): Promise<void> {
  if (atrasoEntreEtapasMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, atrasoEntreEtapasMs));
  }
}

function validarTabelaE2e(): void {
  const tabela = process.env.DYNAMODB_DATA_TABLE ?? "";
  if (!/(local|test)/i.test(tabela)) {
    throw new Error(
      `E2E bloqueado: DYNAMODB_DATA_TABLE deve apontar para tabela local/teste, recebido: ${tabela || "vazio"}`
    );
  }
}

function criarClienteHttp(expressApp: Parameters<typeof supertest>[0]): ReturnType<typeof supertest> {
  return new Proxy({} as ReturnType<typeof supertest>, {
    get(_target, prop) {
      const agent = supertest(expressApp);
      const value = Reflect.get(agent, prop, agent);
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(agent) : value;
    },
  });
}

describeCloud("E2E – Campeonato multi-dia com personas", () => {
  vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

  const prefix = `e2e_md_${Date.now()}_`;
  let req: ReturnType<typeof supertest>;
  let iniciouFixtures = false;

  let org: PersonaRuntime;
  const porChave: Record<string, PersonaRuntime> = {};
  let torneioId = "";

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const authOrg = () => auth(org.token);

  const getStandings = async () => {
    const res = await req.get(`/torneio/${torneioId}/standings`).expect(200);
    return res.body.standings as StandingView[];
  };

  const getPartidas = async (rodada: number) => {
    const res = await req.get(`/torneio/${torneioId}/partidas?rodada=${rodada}`).expect(200);
    return res.body.partidas as PartidaView[];
  };

  const apontarIds = (roteiro: PareamentoRoteiro) => {
    const j1 = porChave[roteiro.j1];
    const j2 = porChave[roteiro.j2];
    if (!j1 || !j2) throw new Error(`Persona ausente no roteiro mesa=${roteiro.mesa}`);
    return { j1, j2 };
  };

  const forcarPareamentos = async (rodada: number, pareamentos: PareamentoRoteiro[]) => {
    const body = {
      partidas: pareamentos.map((p) => {
        const { j1, j2 } = apontarIds(p);
        return {
          jogador1Id: j1.id,
          jogador2Id: j2.id,
          mesa: p.mesa,
        };
      }),
    };
    const res = await req
      .put(`/torneio/${torneioId}/rodada/${rodada}/pareamentos`)
      .set(authOrg())
      .send(body)
      .expect(200);
    return res.body.partidas as PartidaView[];
  };

  const acharPartida = (partidas: PartidaView[], roteiro: PareamentoRoteiro) => {
    const { j1, j2 } = apontarIds(roteiro);
    const partida = partidas.find(
      (p) =>
        (p.jogador1Id === j1.id && p.jogador2Id === j2.id) ||
        (p.jogador1Id === j2.id && p.jogador2Id === j1.id)
    );
    if (!partida) {
      throw new Error(
        `Partida não encontrada rodada para ${roteiro.j1} vs ${roteiro.j2}. ` +
          `Ids: ${partidas.map((p) => `${p.jogador1Id}/${p.jogador2Id}`).join("; ")}`
      );
    }
    // Se o PUT inverteu lados, o placar do roteiro assume j1/j2 do roteiro.
    // Garantimos ordem alinhada ao roteiro via re-pareamento (já enviamos j1/j2).
    if (partida.jogador1Id !== j1.id || partida.jogador2Id !== j2.id) {
      throw new Error(
        `Ordem de lados divergente: esperado ${j1.id} vs ${j2.id}, veio ${partida.jogador1Id} vs ${partida.jogador2Id}`
      );
    }
    return partida;
  };

  const aplicarRoteiroPartida = async (
    partida: PartidaView,
    roteiro: PareamentoRoteiro,
    rodada: number
  ) => {
    const { j1, j2 } = apontarIds(roteiro);

    if (roteiro.resultado === "contestar_ajustar") {
      const c = roteiro.contestar!;
      const reporter = c.reporter === "j1" ? j1 : j2;
      const contestador = c.reporter === "j1" ? j2 : j1;

      const reportado = await req
        .post(`/torneio/partida/${partida.id}/resultado`)
        .set(auth(reporter.token))
        .send(c.placarErrado);
      if (reportado.status !== 200) {
        throw new Error(
          `resultado contestação mesa=${roteiro.mesa}: ${reportado.status} ${JSON.stringify(reportado.body)}`
        );
      }

      const contestado = await req
        .post(`/torneio/partida/${partida.id}/contestar`)
        .set(auth(contestador.token))
        .send({ observacao: c.observacao });
      if (contestado.status !== 200) {
        throw new Error(
          `contestar mesa=${roteiro.mesa}: ${contestado.status} ${JSON.stringify(contestado.body)}`
        );
      }
      expect(contestado.body.contestado).toBe(true);
      expect(contestado.body.observacaoContestacao).toBe(c.observacao);

      const ajustado = await req
        .put(`/torneio/partida/${partida.id}/ajustar`)
        .set(authOrg())
        .send(c.placarFinal);
      if (ajustado.status !== 200) {
        throw new Error(
          `ajustar mesa=${roteiro.mesa}: ${ajustado.status} ${JSON.stringify(ajustado.body)}`
        );
      }
      expect(ajustado.body.contestado).toBe(false);
      expect(ajustado.body.vitoriasJogador1).toBe(c.placarFinal.vitoriasJogador1);
      expect(ajustado.body.vitoriasJogador2).toBe(c.placarFinal.vitoriasJogador2);
      expect(ajustado.body.status).toBe("finalizada");
      return;
    }

    const placar = placarDoPareamento(roteiro);
    // Empate e vitórias: jogador j1 reporta (persona “ativa” do lado 1).
    const registrado = await req
      .post(`/torneio/partida/${partida.id}/resultado`)
      .set(auth(j1.token))
      .send(placar);
    if (registrado.status !== 200) {
      throw new Error(
        `resultado mesa=${roteiro.mesa} ${roteiro.j1}vs${roteiro.j2}: ${registrado.status} ${JSON.stringify(registrado.body)}`
      );
    }

    if (roteiro.confirmar === "ambos") {
      const c1 = await req.post(`/torneio/partida/${partida.id}/confirmar`).set(auth(j1.token));
      const c2 = await req.post(`/torneio/partida/${partida.id}/confirmar`).set(auth(j2.token));
      if (c1.status !== 200 || c2.status !== 200) {
        throw new Error(
          `confirmar mesa=${roteiro.mesa}: j1=${c1.status} ${JSON.stringify(c1.body)} j2=${c2.status} ${JSON.stringify(c2.body)}`
        );
      }
      const partidas = await getPartidas(rodada);
      const atualizada = partidas.find((p) => p.id === partida.id)!;
      expect(atualizada.confirmadoPor).toEqual(expect.arrayContaining([j1.id, j2.id]));
    }
  };

  const resolverRodada = async (rodada: number) => {
    const roteiro = ROTEIRO_RODADAS.find((r) => r.rodada === rodada);
    if (!roteiro) throw new Error(`Sem roteiro para rodada ${rodada}`);

    const partidas = await forcarPareamentos(rodada, roteiro.pareamentos);
    expect(partidas).toHaveLength(roteiro.pareamentos.length);

    for (const item of roteiro.pareamentos) {
      const partida = acharPartida(partidas, item);
      await aplicarRoteiroPartida(partida, item, rodada);
    }

    const finais = await getPartidas(rodada);
    expect(finais.every((p) => p.status === "finalizada")).toBe(true);
    console.info(`[E2E multi-dia] torneioId=${torneioId} rodada=${rodada} fase=${roteiro.fase} resolvida`);
    await pausarParaAcompanhamento();
  };

  const checkinAtivos = async (chaves: string[]) => {
    for (const chave of chaves) {
      await req.post(`/torneio/${torneioId}/checkin`).set(auth(porChave[chave].token)).expect(200);
    }
  };

  beforeAll(async () => {
    validarTabelaE2e();
    req = criarClienteHttp(app());
    iniciouFixtures = true;

    // ── Organizador ──────────────────────────────────────────────────────────
    const orgEmail = `${prefix}${PERSONA_ORG.chave}@test.com`;
    const orgCadastro = await req
      .post("/usuario/cadastrar")
      .send({ nome: PERSONA_ORG.nome, email: orgEmail, senha: SENHA })
      .expect(201);
    const orgUser = await repositorios.usuario.buscarPorId(orgCadastro.body.id);
    if (!orgUser) throw new Error("Organizador não encontrado após cadastro");
    orgUser.role = "admin";
    await repositorios.usuario.atualizar(orgUser);
    const orgLogin = await req.post("/usuario/login").send({ email: orgEmail, senha: SENHA }).expect(200);
    org = {
      ...PERSONA_ORG,
      id: orgCadastro.body.id,
      token: orgLogin.body.token,
      email: orgEmail,
    };
    await req
      .put("/usuario/atualizar")
      .set(authOrg())
      .send({ nickMTGO: `${prefix}${PERSONA_ORG.nickMTGO}` })
      .expect(200);

    // ── Jogadores (personas) ─────────────────────────────────────────────────
    for (const persona of PERSONAS_JOGADORES) {
      const email = `${prefix}${persona.chave}@test.com`;
      const cadastro = await req
        .post("/usuario/cadastrar")
        .send({ nome: persona.nome, email, senha: SENHA })
        .expect(201);
      const login = await req.post("/usuario/login").send({ email, senha: SENHA }).expect(200);
      await req
        .put("/usuario/atualizar")
        .set(auth(login.body.token))
        .send({ nickMTGO: `${prefix}${persona.nickMTGO}` })
        .expect(200);
      porChave[persona.chave] = {
        ...persona,
        id: cadastro.body.id,
        token: login.body.token,
        email,
      };
    }

    // ── Torneio multi-dia ────────────────────────────────────────────────────
    const torneio = await req
      .post("/torneio/criar")
      .set(authOrg())
      .send({
        nome: `${prefix}Campeonato Multi-Dia`,
        horario: new Date(Date.now() + 3_600_000).toISOString(),
        ...CONFIG_TORNEIO_MULTIDIA,
      })
      .expect(201);
    torneioId = torneio.body.id;
    expect(torneio.body.rodadasDay1).toBe(2);
    expect(torneio.body.vagasDay2).toBe(4);
    expect(torneio.body.day1Encerrado).toBe(false);
    console.info(`[E2E multi-dia] torneioId=${torneioId} fase=inscricoes personas=${PERSONAS_JOGADORES.length}`);
    await pausarParaAcompanhamento();

    for (const persona of PERSONAS_JOGADORES) {
      const p = porChave[persona.chave];
      await req.post(`/torneio/${torneioId}/inscrever`).set(auth(p.token)).expect(201);
      const deck = await req
        .post("/deck/cadastrar")
        .set(auth(p.token))
        .send({
          nome: `${prefix}Deck ${persona.chave}`,
          formato: CONFIG_TORNEIO_MULTIDIA.formato,
          maindeck: MAINDECK,
          sideboard: [],
        })
        .expect(201);
      await req
        .post(`/torneio/${torneioId}/deck`)
        .set(auth(p.token))
        .send({ deckId: deck.body.id })
        .expect(200);
      await req.post(`/torneio/${torneioId}/checkin`).set(auth(p.token)).expect(200);
    }
  }, 180_000);

  afterAll(async () => {
    if (!iniciouFixtures) return;
    if (manterFixtures) {
      console.info(`[E2E multi-dia] fixtures preservadas torneioId=${torneioId}`);
      return;
    }
    try {
      if (torneioId) {
        const partidas = await repositorios.partida.listarPorTorneio(torneioId);
        await repositorios.partida.excluirPorIds(partidas.map((p) => p.id));
        const inscricoes = await repositorios.inscricao.listarPorTorneio(torneioId);
        await Promise.all(inscricoes.map((i) => repositorios.inscricao.excluir(i.id)));
        await repositorios.torneio.excluir(torneioId);
      }
      const usuarioIds = [org?.id, ...Object.values(porChave).map((p) => p.id)].filter(Boolean);
      await Promise.all(usuarioIds.map((id) => repositorios.deck.excluirPorUsuario(id)));
      await Promise.all(usuarioIds.map((id) => repositorios.usuario.excluir(id)));
    } catch (erro) {
      console.warn(`[E2E multi-dia] limpeza parcial:`, erro);
    }
  }, 120_000);

  // ═══════════════════════════════════════════════════════════════════════════
  // Day 1
  // ═══════════════════════════════════════════════════════════════════════════

  it("mapeia personas e inicia o Day 1 (rodada 1)", async () => {
    expect(Object.keys(porChave)).toHaveLength(8);
    expect(CHAVES_DAY2).toEqual(["ana_campea", "bruno_vice", "carla_empate", "diego_contesta"]);
    expect(CHAVES_CORTE).toEqual(["elena_corte", "fabio_corte", "gabi_corte", "hugo_corte"]);

    const inicio = await req.post(`/torneio/${torneioId}/iniciar`).set(authOrg()).expect(200);
    expect(inicio.body.rodadaAtual).toBe(1);
    expect(inicio.body.partidas).toHaveLength(4);

    const visao = await req.get(`/torneio/${torneioId}`).expect(200);
    expect(visao.body.status).toBe("em_andamento");
    expect(visao.body.rodadasDay1).toBe(2);
    expect(visao.body.vagasDay2).toBe(4);
    expect(visao.body.day1Encerrado).toBe(false);

    await resolverRodada(1);

    // Standings em andamento excluem a rodada vigente até avançar (ou encerrar Day 1).
    const standingsDuranteR1 = await getStandings();
    for (const chave of CHAVES_DAY2) {
      const s = standingsDuranteR1.find((item) => item.usuario.id === porChave[chave].id);
      expect(s?.pontosMesa).toBe(0);
      expect(s?.dropped).toBe(false);
    }

    const partidasR1 = await getPartidas(1);
    for (const item of ROTEIRO_RODADAS[0].pareamentos) {
      const partida = acharPartida(partidasR1, item);
      const placar = placarDoPareamento(item);
      expect(partida.status).toBe("finalizada");
      expect(partida.vitoriasJogador1).toBe(placar.vitoriasJogador1);
      expect(partida.vitoriasJogador2).toBe(placar.vitoriasJogador2);
    }
  });

  it("bloqueia avançar para Day 2 sem Encerrar Day 1", async () => {
    await checkinAtivos([...CHAVES_DAY2, ...CHAVES_CORTE]);
    const res = await req.post(`/torneio/${torneioId}/proxima-rodada`).set(authOrg()).expect(200);
    expect(res.body.rodadaAtual).toBe(2);

    // Após avançar, R1 consolida → favoritos com 3 pts
    const standingsAposR1 = await getStandings();
    for (const chave of CHAVES_DAY2) {
      expect(standingsAposR1.find((s) => s.usuario.id === porChave[chave].id)?.pontosMesa).toBe(3);
    }
    for (const chave of CHAVES_CORTE) {
      expect(standingsAposR1.find((s) => s.usuario.id === porChave[chave].id)?.pontosMesa).toBe(0);
    }

    await resolverRodada(2);

    // Ainda na R2: standings só com R1 (R2 ainda não consolidada)
    const standingsDuranteR2 = await getStandings();
    for (const chave of CHAVES_DAY2) {
      expect(standingsDuranteR2.find((s) => s.usuario.id === porChave[chave].id)?.pontosMesa).toBe(3);
    }

    // Última rodada do Day 1 — proxima-rodada exige encerrar-day1
    await checkinAtivos([...CHAVES_DAY2, ...CHAVES_CORTE]);
    const bloqueio = await req.post(`/torneio/${torneioId}/proxima-rodada`).set(authOrg()).expect(400);
    expect(String(bloqueio.body.mensagem)).toMatch(/Encerre o Day 1/i);
  });

  it("encerra Day 1: classifica 4 personas e dropa as 4 de corte", async () => {
    const day1 = await req.post(`/torneio/${torneioId}/encerrar-day1`).set(authOrg()).expect(200);

    expect(day1.body.status).toBe("pausado");
    expect(day1.body.day1Encerrado).toBe(true);
    expect(day1.body.classificados).toBe(4);
    expect(day1.body.dropados).toBe(4);

    const classificadosIds = (day1.body.jogadoresClassificados as Array<{ id: string }>).map((j) => j.id);
    expect(classificadosIds.sort()).toEqual(CHAVES_DAY2.map((c) => porChave[c].id).sort());

    const visao = await req.get(`/torneio/${torneioId}`).expect(200);
    expect(visao.body.status).toBe("pausado");
    expect(visao.body.day1Encerrado).toBe(true);
    expect(visao.body.rodadaAtual).toBe(2);

    // Encerrar Day 1 consolida a rodada vigente nos standings
    const standings = await getStandings();
    for (const [chave, pontos] of Object.entries(PONTOS_ESPERADOS.aposDay1)) {
      const s = standings.find((item) => item.usuario.id === porChave[chave].id);
      expect(s?.pontosMesa, chave).toBe(pontos);
    }
    for (const chave of CHAVES_DAY2) {
      const s = standings.find((item) => item.usuario.id === porChave[chave].id)!;
      expect(s.dropped).toBe(false);
    }
    for (const chave of CHAVES_CORTE) {
      const s = standings.find((item) => item.usuario.id === porChave[chave].id)!;
      expect(s.dropped).toBe(true);
      expect(s.droppedRodada).toBe(2);
    }

    // Mutações de resultado bloqueadas enquanto pausado
    const partidas = await getPartidas(2);
    const tentativa = await req
      .post(`/torneio/partida/${partidas[0].id}/resultado`)
      .set(authOrg())
      .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 });
    expect(tentativa.status).toBe(400);
    expect(String(tentativa.body.mensagem)).toMatch(/pausado/i);

    console.info(`[E2E multi-dia] torneioId=${torneioId} fase=pausado_day1`);
    await pausarParaAcompanhamento();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Day 2 — empate, contestação, final
  // ═══════════════════════════════════════════════════════════════════════════

  it("retoma Day 2 com empate e contestação (rodada 3)", async () => {
    await checkinAtivos(CHAVES_DAY2);

    const r3 = await req.post(`/torneio/${torneioId}/proxima-rodada`).set(authOrg()).expect(200);
    expect(r3.body.finalizado).toBe(false);
    expect(r3.body.rodadaAtual).toBe(3);

    const visao = await req.get(`/torneio/${torneioId}`).expect(200);
    expect(visao.body.status).toBe("em_andamento");
    expect(visao.body.day1Encerrado).toBe(true);

    await resolverRodada(3);

    const partidas = await getPartidas(3);
    const anaDiego = partidas.find(
      (p) =>
        p.jogador1Id === porChave.diego_contesta.id && p.jogador2Id === porChave.ana_campea.id
    )!;
    expect(anaDiego.contestado).toBe(false);
    expect(anaDiego.vitoriasJogador1).toBe(1);
    expect(anaDiego.vitoriasJogador2).toBe(2);

    const empate = partidas.find(
      (p) =>
        p.jogador1Id === porChave.bruno_vice.id && p.jogador2Id === porChave.carla_empate.id
    )!;
    expect(empate.vitoriasJogador1).toBe(1);
    expect(empate.vitoriasJogador2).toBe(1);

    // Ainda na R3: standings = só Day 1 consolidado (6 pts cada favorito)
    const standingsDuranteR3 = await getStandings();
    for (const chave of CHAVES_DAY2) {
      expect(standingsDuranteR3.find((s) => s.usuario.id === porChave[chave].id)?.pontosMesa).toBe(6);
    }
  });

  it("fecha Day 2 (rodada 4) e finaliza com Ana campeã", async () => {
    await checkinAtivos(CHAVES_DAY2);

    const r4 = await req.post(`/torneio/${torneioId}/proxima-rodada`).set(authOrg()).expect(200);
    expect(r4.body.rodadaAtual).toBe(4);

    // R3 consolidou ao avançar
    const standingsAposR3 = await getStandings();
    expect(standingsAposR3.find((s) => s.usuario.id === porChave.ana_campea.id)?.pontosMesa).toBe(9);
    expect(standingsAposR3.find((s) => s.usuario.id === porChave.bruno_vice.id)?.pontosMesa).toBe(7);
    expect(standingsAposR3.find((s) => s.usuario.id === porChave.carla_empate.id)?.pontosMesa).toBe(7);
    expect(standingsAposR3.find((s) => s.usuario.id === porChave.diego_contesta.id)?.pontosMesa).toBe(6);

    await resolverRodada(4);

    const fim = await req.post(`/torneio/${torneioId}/proxima-rodada`).set(authOrg()).expect(200);
    expect(fim.body.finalizado).toBe(true);

    const classificacao = fim.body.classificacao as Array<{
      posicao: number;
      usuarioId: string;
      pontosMesa: number;
    }>;
    expect(classificacao[0].usuarioId).toBe(porChave.ana_campea.id);
    expect(classificacao[0].pontosMesa).toBe(PONTOS_ESPERADOS.aposDay2.ana_campea);
    expect(classificacao[1].usuarioId).toBe(porChave.diego_contesta.id);
    expect(classificacao[1].pontosMesa).toBe(PONTOS_ESPERADOS.aposDay2.diego_contesta);

    for (const [chave, pontos] of Object.entries(PONTOS_ESPERADOS.aposDay2)) {
      const linha = classificacao.find((c) => c.usuarioId === porChave[chave].id);
      expect(linha?.pontosMesa, chave).toBe(pontos);
    }

    const visao = await req.get(`/torneio/${torneioId}`).expect(200);
    expect(visao.body.status).toBe("finalizado");
    console.info(`[E2E multi-dia] torneioId=${torneioId} fase=finalizado campea=ana_campea`);
    await pausarParaAcompanhamento();
  });

  it("documenta o mapa de personas no log (auditoria do roteiro)", () => {
    const mapa = PERSONAS_JOGADORES.map((p) => ({
      chave: p.chave,
      papel: p.papel,
      avancaDay2: p.avancaDay2,
      usuarioId: porChave[p.chave]?.id,
      descricao: p.descricao,
    }));
    console.info("[E2E multi-dia] mapa personas=", JSON.stringify(mapa, null, 2));
    console.info(
      "[E2E multi-dia] roteiro=",
      JSON.stringify(
        ROTEIRO_RODADAS.map((r) => ({
          rodada: r.rodada,
          fase: r.fase,
          mesas: r.pareamentos.map((m) => ({
            mesa: m.mesa,
            j1: m.j1,
            j2: m.j2,
            resultado: m.resultado,
          })),
        })),
        null,
        2
      )
    );
    expect(mapa).toHaveLength(8);
  });
});
