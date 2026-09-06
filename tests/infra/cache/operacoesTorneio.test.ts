import { DynamoMemoria } from "./support/dynamoMemoria";
import { CenarioTorneio, T, L, admin } from "./support/cenarioTorneio";
import { Time } from "../../../src/dominio/entidade/time";
import { StatusTorneio } from "../../../src/dominio/entidade/torneio";

type Operacao = {
  nome: string; status?: StatusTorneio;
  preparar?: (c: CenarioTorneio) => Promise<unknown>;
  executar: (c: CenarioTorneio) => Promise<unknown>;
  conferir?: (c: CenarioTorneio) => Promise<unknown>;
  mudou?: boolean;
};
const operacoes: Operacao[] = [
  { nome: "criar torneio", executar: c => c.casos.criarTorneio.executar({ nome: "Novo", donoId: "admin", formato: "pauper", horario: new Date() }) },
  { nome: "editar nome, banner e YouTube em andamento", executar: c => c.casos.alterarTorneio.executar({ ...admin, nome: "Atualizado", bannerUrl: "https://example.test/banner.png", linkLive: "https://youtube.com/watch?v=novo" }) },
  { nome: "editar premiação em andamento", executar: c => c.casos.alterarTorneio.executar({ ...admin, premio: { playerPoints: 100, tix: 2.5 } }), conferir: async c => { expect((await c.repos.torneio.buscarPorId(T))?.premio).toEqual({ playerPoints: 100, tix: 2.5 }); } },
  { nome: "jogar rodada extra após última rodada", preparar: async c => { await c.resultados(); await c.casos.ajustarTotalRodadas.executar({ ...admin, totalRodadas: 1 }); }, executar: async c => { await c.casos.ajustarTotalRodadas.executar({ ...admin, totalRodadas: 2 }); await c.casos.iniciarProximaRodada.executar(admin); }, conferir: async c => { expect(await c.repos.torneio.buscarPorId(T)).toMatchObject({ status: "em_andamento", rodadaAtual: 2, totalRodadas: 2 }); } },
  { nome: "remover YouTube", preparar: c => c.casos.alterarTorneio.executar({ ...admin, linkLive: "https://youtube.com/watch?v=antigo" }), executar: c => c.casos.alterarTorneio.executar({ ...admin, linkLive: "" }) },
  { nome: "definir anfitrião", executar: c => c.casos.definirAnfitriaoTorneio.executar({ torneioId: T, anfitriaoId: "host" }), mudou: false,
    conferir: async c => expect((await c.repos.torneio.buscarPorId(T))?.anfitriaoId).toBe("host") },
  { nome: "remover anfitrião", preparar: c => c.casos.definirAnfitriaoTorneio.executar({ torneioId: T, anfitriaoId: "host" }), executar: c => c.casos.definirAnfitriaoTorneio.executar({ torneioId: T, anfitriaoId: null }), mudou: false },
  { nome: "inscrever jogador", status: "inscricoes_abertas", executar: c => c.casos.inscreverTorneio.executar({ torneioId: T, usuarioId: "u5" }) },
  { nome: "check-in inicial", status: "inscricoes_abertas", preparar: async c => { const i = (await c.repos.inscricao.buscarPorTorneioEUsuario(T, "u1"))!; i.checkInRodada = -1; await c.repos.inscricao.atualizar(i); }, executar: c => c.casos.checkInTorneio.executar({ torneioId: T, usuarioId: "u1" }) },
  { nome: "check-in da rodada", executar: c => c.casos.checkInTorneio.executar({ torneioId: T, usuarioId: "u1" }) },
  { nome: "escolher e clonar deck", status: "inscricoes_abertas", executar: c => c.casos.escolherDeckTorneio.executar({ ...admin, usuarioId: "u1", deckId: "deck-u1" }) },
  { nome: "iniciar torneio", status: "inscricoes_abertas", executar: c => c.casos.iniciarTorneio.executar(admin) },
  { nome: "registrar resultado", executar: c => c.casos.registrarResultado.executar({ ...admin, partidaId: "p1", vitoriasJogador1: 2, vitoriasJogador2: 1 }) },
  { nome: "confirmar resultado", preparar: c => c.resultados(), executar: c => c.casos.confirmarResultado.executar({ partidaId: "p1", usuarioId: "u1" }) },
  { nome: "contestar resultado", preparar: c => c.resultados(), executar: c => c.casos.contestarResultado.executar({ ...admin, partidaId: "p1", observacao: "Placar incorreto" }) },
  { nome: "ajustar resultado contestado", preparar: async c => { await c.resultados(); await c.casos.contestarResultado.executar({ ...admin, partidaId: "p1" }); }, executar: c => c.casos.ajustarResultado.executar({ ...admin, partidaId: "p1", vitoriasJogador1: 0, vitoriasJogador2: 2 }) },
  { nome: "alterar mesa", executar: c => c.casos.atualizarMesaPartida.executar({ ...admin, partidaId: "p1", mesa: 9 }) },
  { nome: "alterar pareamentos", executar: c => c.casos.atualizarPareamentosRodada.executar({ ...admin, rodada: 1, partidas: [{ id: "p1", jogador1Id: "u1", jogador2Id: "u3", mesa: 1 }, { id: "p2", jogador1Id: "u2", jogador2Id: "u4", mesa: 2 }] }) },
  { nome: "drop com WO", executar: c => c.casos.droparJogador.executar({ ...admin, jogadorId: "u1" }) },
  { nome: "desdrop e reabertura da partida", preparar: c => c.casos.droparJogador.executar({ ...admin, jogadorId: "u1" }), executar: c => c.casos.desdroparJogador.executar({ ...admin, jogadorId: "u1" }) },
  { nome: "remover inscrição antes do início", status: "inscricoes_abertas", executar: c => c.casos.droparJogador.executar({ ...admin, jogadorId: "u1" }) },
  { nome: "drop em lote sem deck", status: "inscricoes_abertas", preparar: async c => { const i = (await c.repos.inscricao.buscarPorTorneioEUsuario(T, "u1"))!; i.deckId = undefined; await c.repos.inscricao.atualizar(i); }, executar: c => c.casos.droparJogadoresSemDeck.executar(admin) },
  { nome: "drop em lote sem check-in", executar: c => c.casos.droparJogadoresSemCheckin.executar(admin) },
  { nome: "avançar rodada Swiss", preparar: c => c.resultados(), executar: c => c.casos.iniciarProximaRodada.executar(admin) },
  { nome: "ajustar total de rodadas", executar: c => c.casos.ajustarTotalRodadas.executar({ ...admin, totalRodadas: 4 }) },
  { nome: "refazer rodada e remover partidas", preparar: async c => { await c.resultados(); await c.casos.iniciarProximaRodada.executar(admin); }, executar: c => c.casos.refazerRodada.executar(admin) },
  { nome: "encerrar e incluir no metagame e liga", preparar: c => c.resultados(), executar: c => c.casos.encerrarTorneio.executar(admin), conferir: async c => { expect((await c.consultas(c.leitor).meta.executar({ formato: "pauper" })).totalTorneios).toBe(1); expect((await c.consultas(c.leitor).ranking.executar({ ligaId: L })).totalJogadores).toBe(4); } },
  { nome: "finalizar automaticamente após última rodada", preparar: async c => { await c.resultados(); await c.casos.ajustarTotalRodadas.executar({ ...admin, totalRodadas: 1 }); }, executar: c => c.casos.iniciarProximaRodada.executar(admin) },
  { nome: "iniciar corte Top 4", preparar: async c => { await c.resultados(); const t = (await c.repos.torneio.buscarPorId(T))!; t.totalRodadas = 1; t.corteTop = 4; await c.repos.torneio.atualizar(t); }, executar: c => c.casos.iniciarProximaRodada.executar(admin) },
  { nome: "ingresso tardio com deck e bye de penalidade", executar: async c => { const link = await c.casos.gerarLinkIngresso.executar(admin); return c.casos.ingressarViaTorneio.executar({ token: link.token, usuarioId: "u5", deckId: "deck-u5" }); } },
  { nome: "avançar semifinal para final", preparar: async c => { await c.resultados(); const t = (await c.repos.torneio.buscarPorId(T))!; t.totalRodadas = 1; t.corteTop = 4; await c.repos.torneio.atualizar(t); await c.casos.iniciarProximaRodada.executar(admin); await c.resultados(); }, executar: c => c.casos.iniciarProximaRodada.executar(admin) },
  { nome: "finalizar corte e atualizar resultados expressivos", preparar: async c => { await c.resultados(); const t = (await c.repos.torneio.buscarPorId(T))!; t.totalRodadas = 1; t.corteTop = 2; await c.repos.torneio.atualizar(t); await c.casos.iniciarProximaRodada.executar(admin); await c.resultados(); }, executar: c => c.casos.iniciarProximaRodada.executar(admin) },
  { nome: "refazer primeira rodada do corte", preparar: async c => { await c.resultados(); const t = (await c.repos.torneio.buscarPorId(T))!; t.totalRodadas = 1; t.corteTop = 4; await c.repos.torneio.atualizar(t); await c.casos.iniciarProximaRodada.executar(admin); }, executar: c => c.casos.refazerRodada.executar(admin) },
  { nome: "substituir partidas pendentes removendo IDs antigos", executar: c => c.casos.atualizarPareamentosRodada.executar({ ...admin, rodada: 1, partidas: [{ jogador1Id: "u1", jogador2Id: "u3", mesa: 1 }, { jogador1Id: "u2", jogador2Id: "u4", mesa: 2 }] }) },
  { nome: "trocar nome do jogador após finalização", preparar: async c => { await c.resultados(); await c.casos.encerrarTorneio.executar(admin); }, executar: c => c.casos.atualizarUsuario.executar({ id: "u1", nome: "Nome atualizado" }) },
  { nome: "trocar exibição para nick MOL", executar: c => c.casos.alterarTorneio.executar({ ...admin, exibirNomeJogador: "nickMOL" }) },
  { nome: "atualizar arquétipo e cartas de deck usado em resultado", preparar: async c => { await c.resultados(); await c.casos.encerrarTorneio.executar(admin); }, executar: c => c.casos.atualizarDeck.executar({ id: "deck-u1", usuarioIdRequisitante: "u1", usuarioNome: "u1", isAdmin: true, nome: "Novo deck", nomeConsolidado: "Control", maindeck: [{ nome: "Island", quantidade: 60 }] }) },
  { nome: "renomear time usado nos standings", preparar: async c => { await c.repos.time.salvar(new Time({ id: "time", nome: "Time antigo", donoId: "u1", membroIds: ["u1", "u2"] })); }, executar: async c => { const time = (await c.repos.time.buscarPorId("time"))!; time.nome = "Time novo"; await c.repos.time.atualizar(time); } },
  { nome: "tornar torneio secreto", executar: c => c.casos.alterarTorneio.executar({ ...admin, secreto: true }) },
  { nome: "excluir torneio e rejeitar snapshots antigos", status: "inscricoes_abertas", executar: c => c.casos.excluirTorneio.executar(admin) },
];

describe("operações reais do torneio com caches aquecidos", () => {
  const env = { ...process.env };
  let db: DynamoMemoria;
  let c: CenarioTorneio;
  beforeEach(() => {
    Object.assign(process.env, { DYNAMODB_DATA_TABLE: "dados-cache-test", DYNAMODB_CACHE_TABLE: "cache-test", DYNAMODB_CACHE_ENABLED: "true", AWS_REGION: "us-east-1", AWS_S3_BUCKET: "cache-test", AWS_S3_REGION: "us-east-1" });
    db = new DynamoMemoria(); db.instalar(); c = new CenarioTorneio(db);
  });
  afterEach(() => { db.restaurar(); process.env = { ...env }; });

  it.each(operacoes)("$nome: próxima leitura equivale à origem sem esperar TTL", async op => {
    await c.preparar(op.status);
    await op.preparar?.(c);
    const before = await c.aquecer();
    const versao = await c.cache.obterVersao(`torneio#${T}`);
    await op.executar(c);
    expect(await c.leitor.obterVersao(`torneio#${T}`)).not.toBe(versao);
    await c.verificar(before, op.mudou !== false);
    await op.conferir?.(c);
  });
});
