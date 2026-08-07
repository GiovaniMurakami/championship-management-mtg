import { BuscarStandings } from "../../../src/casosDeUso/torneio/buscarStandings";
import { MaterializarStandings } from "../../../src/casosDeUso/torneio/materializarStandings";
import {
  criarMockTorneioGateway,
  criarMockInscricaoGateway,
  criarMockPartidaGateway,
  criarMockUsuarioGateway,
  criarMockDeckGateway,
  criarMockTimeGateway,
  criarMockStandingsGateway,
} from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Standings } from "../../../src/dominio/entidade/standings";

/**
 * Factory: BuscarStandings com backfill (MaterializarStandings real).
 * Standings gateway começa vazio → GET materializa via mesma lógica Swiss de antes.
 */
function criarUC(opts: {
  torneio?: Torneio | null;
  inscricoes?: Inscricao[];
  partidas?: Partida[];
  usuarios?: Usuario[];
  decks?: Deck[];
  times?: unknown[];
  snapshotAtual?: Standings | null;
} = {}) {
  const torneioGw = criarMockTorneioGateway({
    buscarPorId: jest.fn().mockResolvedValue(opts.torneio ?? null),
  });
  const inscricaoGw = criarMockInscricaoGateway({
    listarPorTorneio: jest.fn().mockResolvedValue(opts.inscricoes ?? []),
    contarPorTorneios: jest.fn().mockResolvedValue({
      [opts.torneio?.id ?? ""]:
        opts.inscricoes?.length ?? opts.snapshotAtual?.totalInscritos ?? 0,
    }),
  });
  const partidaGw = criarMockPartidaGateway({
    listarPorTorneio: jest.fn().mockResolvedValue(opts.partidas ?? []),
  });
  const usuarioGw = criarMockUsuarioGateway({
    buscarVarios: jest.fn().mockResolvedValue(opts.usuarios ?? []),
  });
  const deckGw = criarMockDeckGateway({
    buscarVarios: jest.fn().mockResolvedValue(opts.decks ?? []),
  });
  const timeGw = criarMockTimeGateway({
    buscarPorMembros: jest.fn().mockResolvedValue(opts.times ?? []),
  });
  const standingsGw = criarMockStandingsGateway({
    buscarAtual: jest.fn().mockResolvedValue(opts.snapshotAtual ?? null),
    buscarPorTorneioERodada: jest.fn().mockResolvedValue(null),
    salvarSnapshot: jest.fn().mockImplementation(async (snap) => snap),
  });
  const materializar = MaterializarStandings.criar(
    torneioGw, inscricaoGw, partidaGw, usuarioGw, deckGw, timeGw, standingsGw
  );
  return BuscarStandings.criar(
    torneioGw, inscricaoGw, partidaGw, usuarioGw, deckGw, timeGw, standingsGw, materializar
  );
}

describe("BuscarStandings", () => {
  const torneioEmAndamento = new Torneio({
    id: "t-1", nome: "T", horario: new Date(), formato: "legacy",
    donoId: "d", status: "em_andamento", rodadaAtual: 2, totalRodadas: 3,
  });

  const torneioAberto = new Torneio({
    id: "t-2", nome: "T2", horario: new Date(), formato: "legacy",
    donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
  });

  it("deve retornar standings sem estatísticas quando torneio em andamento na rodada 1", async () => {
    const torneioRodada1 = new Torneio({
      id: "t-1", nome: "T", horario: new Date(), formato: "legacy",
      donoId: "d", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
    });
    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
      new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: false }),
    ];
    const partidas = [
      new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
    ];
    const usuarios = [
      new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" }),
      new Usuario({ id: "u-2", nome: "Maria", email: "m@e.com", senha: "s" }),
    ];

    const resultado = await criarUC({
      torneio: torneioRodada1, inscricoes, partidas, usuarios,
    }).executar({ torneioId: "t-1" });

    expect(resultado.totalInscritos).toBe(2);
    expect(resultado.standings).toHaveLength(2);
    expect(resultado.standings[0].pontosMesa).toBe(0);
    expect(resultado.standings[1].pontosMesa).toBe(0);
    expect(resultado.standings[0].mwp).toBe(0);
  });

  it("deve retornar standings com estatísticas quando torneio em andamento", async () => {
    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
      new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: false }),
    ];
    const partidas = [
      new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
    ];
    const usuarios = [
      new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" }),
      new Usuario({ id: "u-2", nome: "Maria", email: "m@e.com", senha: "s" }),
    ];

    const resultado = await criarUC({
      torneio: torneioEmAndamento, inscricoes, partidas, usuarios,
    }).executar({ torneioId: "t-1" });

    expect(resultado.standings).toHaveLength(2);
    expect(resultado.standings[0].usuario.nome).toBe("João");
    expect(resultado.standings[0].pontosMesa).toBe(3);
    expect(resultado.standings[0].vitoriasPartida).toBe(1);
    expect(resultado.standings[1].usuario.nome).toBe("Maria");
    expect(resultado.standings[1].pontosMesa).toBe(0);
  });

  it("deve ler snapshot materializado sem recalcular", async () => {
    const snapshot = Standings.criar({
      torneioId: "t-1",
      rodada: 1,
      totalInscritos: 2,
      jogadores: [
        {
          posicao: 1,
          usuario: { id: "u-1", nome: "João", resultadosExpressivos: 0 },
          time: null,
          pontosMesa: 3,
          vitoriasPartida: 1,
          empatesPartida: 0,
          derrotasPartida: 0,
          mwp: 1,
          omwp: 0.33,
          gwp: 0.66,
          ogwp: 0.33,
          checkInRodada: 1,
          deckId: null,
          deckNome: null,
          dropped: false,
          resultadosExpressivos: 0,
        },
      ],
    });

    const partidaGwListar = jest.fn();
    const torneioGw = criarMockTorneioGateway({
      buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento),
    });
    const standingsGw = criarMockStandingsGateway({
      buscarAtual: jest.fn().mockResolvedValue(snapshot),
    });
    const partidaGw = criarMockPartidaGateway({ listarPorTorneio: partidaGwListar });
    const inscricaoGw = criarMockInscricaoGateway({
      contarPorTorneios: jest.fn().mockResolvedValue({ "t-1": 2 }),
    });
    const materializar = MaterializarStandings.criar(
      torneioGw,
      inscricaoGw,
      partidaGw,
      criarMockUsuarioGateway(),
      criarMockDeckGateway(),
      criarMockTimeGateway(),
      standingsGw
    );
    const uc = BuscarStandings.criar(
      torneioGw,
      inscricaoGw,
      partidaGw,
      criarMockUsuarioGateway(),
      criarMockDeckGateway(),
      criarMockTimeGateway(),
      standingsGw,
      materializar
    );

    const resultado = await uc.executar({ torneioId: "t-1" });

    expect(resultado.standings[0].pontosMesa).toBe(3);
    expect(resultado.rodadaStandings).toBe(1);
    expect(partidaGwListar).not.toHaveBeenCalled();
  });

  it("deve retornar standings sem estatísticas quando inscricoes_abertas", async () => {
    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t-2", usuarioId: "u-1", checkInRodada: -1, dropped: false }),
    ];
    const usuarios = [
      new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" }),
    ];

    const resultado = await criarUC({
      torneio: torneioAberto, inscricoes, usuarios,
    }).executar({ torneioId: "t-2" });

    expect(resultado.standings).toHaveLength(1);
    expect(resultado.standings[0].pontosMesa).toBe(0);
  });

  it("deve incluir informações de deck quando disponíveis", async () => {
    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", deckId: "d-1", checkInRodada: 1, dropped: false }),
    ];
    const partidas = [
      new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: null, vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
    ];
    const usuarios = [
      new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" }),
    ];
    const decks = [
      new Deck({ id: "d-1", nome: "Burn", formato: "legacy", maindeck: [], sideboard: [], usuarioId: "u-1" }),
    ];

    const resultado = await criarUC({
      torneio: torneioEmAndamento, inscricoes, partidas, usuarios, decks,
    }).executar({ torneioId: "t-1" });

    expect(resultado.standings[0].deckId).toBe("d-1");
    expect(resultado.standings[0].deckNome).toBe("Burn");
  });

  it("deve lançar erro se torneio não encontrado", async () => {
    await expect(
      criarUC().executar({ torneioId: "x" })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("deve retornar standings completos quando torneio finalizado", async () => {
    const torneioFinalizado = new Torneio({
      id: "t-1", nome: "T", horario: new Date(), formato: "legacy",
      donoId: "d", status: "finalizado", rodadaAtual: 2, totalRodadas: 2,
    });
    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 2, dropped: false }),
      new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 2, dropped: false }),
    ];
    const partidas = [
      new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
      new Partida({ id: "p2", torneioId: "t-1", rodada: 2, jogador1Id: "u-2", jogador2Id: "u-1", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
    ];
    const usuarios = [
      new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" }),
      new Usuario({ id: "u-2", nome: "Maria", email: "m@e.com", senha: "s" }),
    ];

    const resultado = await criarUC({
      torneio: torneioFinalizado, inscricoes, partidas, usuarios,
    }).executar({ torneioId: "t-1" });

    expect(resultado.standings).toHaveLength(2);
    expect(resultado.standings[0].pontosMesa).toBe(3);
    expect(resultado.standings[1].pontosMesa).toBe(3);
  });

  it("deve ignorar partidas do corte ao calcular standings do suíço", async () => {
    const torneioFinalizadoComCorte = new Torneio({
      id: "t-1", nome: "T", horario: new Date(), formato: "legacy",
      donoId: "d", status: "finalizado", rodadaAtual: 4, totalRodadas: 4,
      corteTop: 4, emCorte: true,
    });
    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 2, dropped: false }),
      new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 2, dropped: false }),
      new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 2, dropped: false }),
      new Inscricao({ id: "i4", torneioId: "t-1", usuarioId: "u-4", checkInRodada: 2, dropped: false }),
    ];
    const partidas = [
      new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
      new Partida({ id: "p2", torneioId: "t-1", rodada: 1, jogador1Id: "u-3", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
      new Partida({ id: "p3", torneioId: "t-1", rodada: 2, jogador1Id: "u-1", jogador2Id: "u-3", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
      new Partida({ id: "p4", torneioId: "t-1", rodada: 2, jogador1Id: "u-2", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
      new Partida({ id: "p5", torneioId: "t-1", rodada: 3, jogador1Id: "u-1", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
      new Partida({ id: "p6", torneioId: "t-1", rodada: 4, jogador1Id: "u-1", jogador2Id: "u-3", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
    ];
    const usuarios = [
      new Usuario({ id: "u-1", nome: "Jogador 1", email: "u1@e.com", senha: "s" }),
      new Usuario({ id: "u-2", nome: "Jogador 2", email: "u2@e.com", senha: "s" }),
      new Usuario({ id: "u-3", nome: "Jogador 3", email: "u3@e.com", senha: "s" }),
      new Usuario({ id: "u-4", nome: "Jogador 4", email: "u4@e.com", senha: "s" }),
    ];

    const resultado = await criarUC({
      torneio: torneioFinalizadoComCorte, inscricoes, partidas, usuarios,
    }).executar({ torneioId: "t-1" });
    const lider = resultado.standings.find((s) => s.usuario.id === "u-1")!;

    expect(lider.pontosMesa).toBe(6);
    expect(lider.vitoriasPartida).toBe(2);
  });

  it("deve calcular standings de torneio finalizado com apenas 1 rodada", async () => {
    const torneioFinalizadoUmaRodada = new Torneio({
      id: "t-1", nome: "T", horario: new Date(), formato: "legacy",
      donoId: "d", status: "finalizado", rodadaAtual: 1, totalRodadas: 1,
    });
    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
      new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: false }),
    ];
    const partidas = [
      new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 1, vitoriasJogador2: 2, status: "finalizada" }),
    ];
    const usuarios = [
      new Usuario({ id: "u-1", nome: "Jogador 1", email: "u1@e.com", senha: "s" }),
      new Usuario({ id: "u-2", nome: "Jogador 2", email: "u2@e.com", senha: "s" }),
    ];

    const resultado = await criarUC({
      torneio: torneioFinalizadoUmaRodada, inscricoes, partidas, usuarios,
    }).executar({ torneioId: "t-1" });

    expect(resultado.standings[0].usuario.id).toBe("u-2");
    expect(resultado.standings[0].pontosMesa).toBe(3);
    expect(resultado.standings[1].usuario.id).toBe("u-1");
  });

  it("deve incluir jogador dropado nos standings", async () => {
    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
      new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: true }),
    ];
    const partidas = [
      new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
    ];
    const usuarios = [
      new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" }),
      new Usuario({ id: "u-2", nome: "Maria", email: "m@e.com", senha: "s" }),
    ];

    const resultado = await criarUC({
      torneio: torneioEmAndamento, inscricoes, partidas, usuarios,
    }).executar({ torneioId: "t-1" });

    const standingDropado = resultado.standings.find(s => s.usuario.id === "u-2");
    expect(standingDropado!.dropped).toBe(true);
    expect(standingDropado!.pontosMesa).toBe(0);
  });

  it("deve contabilizar BYE no total de partidas jogadas", async () => {
    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
      new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: false }),
      new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 1, dropped: false }),
    ];
    const partidas = [
      new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
      new Partida({ id: "p2", torneioId: "t-1", rodada: 1, jogador1Id: "u-3", jogador2Id: null, vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
    ];
    const usuarios = [
      new Usuario({ id: "u-1", nome: "A", email: "a@e.com", senha: "s" }),
      new Usuario({ id: "u-2", nome: "B", email: "b@e.com", senha: "s" }),
      new Usuario({ id: "u-3", nome: "C", email: "c@e.com", senha: "s" }),
    ];
    const torneioR2 = new Torneio({
      id: "t-1", nome: "T", horario: new Date(), formato: "legacy",
      donoId: "d", status: "finalizado", rodadaAtual: 2, totalRodadas: 2,
    });

    const resultado = await criarUC({
      torneio: torneioR2, inscricoes, partidas, usuarios,
    }).executar({ torneioId: "t-1" });

    const sU3 = resultado.standings.find(s => s.usuario.id === "u-3")!;
    expect(sU3.pontosMesa).toBe(3);
    expect(sU3.vitoriasPartida).toBe(1);
  });

  it("duas materializações da mesma rodada são idempotentes (upsert)", async () => {
    const snapshots: Standings[] = [];
    const standingsGw = criarMockStandingsGateway({
      salvarSnapshot: jest.fn().mockImplementation(async (s: Standings) => {
        const existing = snapshots.find(
          (x) => x.torneioId === s.torneioId && x.rodada === s.rodada
        );
        if (existing) {
          return existing;
        }
        snapshots.push(s);
        return s;
      }),
      buscarAtual: jest.fn().mockImplementation(async () =>
        snapshots.sort((a, b) => b.rodada - a.rodada)[0] ?? null
      ),
    });

    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
      new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: false }),
    ];
    const partidas = [
      new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
    ];
    const usuarios = [
      new Usuario({ id: "u-1", nome: "A", email: "a@e.com", senha: "s" }),
      new Usuario({ id: "u-2", nome: "B", email: "b@e.com", senha: "s" }),
    ];

    const torneioGw = criarMockTorneioGateway({
      buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento),
    });
    const materializar = MaterializarStandings.criar(
      torneioGw,
      criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
      criarMockPartidaGateway({ listarPorTorneio: jest.fn().mockResolvedValue(partidas) }),
      criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
      criarMockDeckGateway(),
      criarMockTimeGateway(),
      standingsGw
    );

    const [a, b] = await Promise.all([
      materializar.executar({ torneio: torneioEmAndamento, rodadaConsolidada: 1 }),
      materializar.executar({ torneio: torneioEmAndamento, rodadaConsolidada: 1 }),
    ]);

    expect(a.rodada).toBe(1);
    expect(b.rodada).toBe(1);
    expect(snapshots).toHaveLength(1);
  });

  it("deve lançar 409 se avanço de rodada perder a corrida CAS", async () => {
    const { IniciarProximaRodada } = require("../../../src/casosDeUso/torneio/iniciarProximaRodada");
    const torneio = new Torneio({
      id: "t-1", nome: "T", horario: new Date(), formato: "f",
      donoId: "dono", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
    });
    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
      new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: false }),
    ];
    const partidasRodada1 = [
      new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
    ];
    const usuarios = [
      new Usuario({ id: "u-1", nome: "A", email: "a@e.com", senha: "s" }),
      new Usuario({ id: "u-2", nome: "B", email: "b@e.com", senha: "s" }),
    ];

    const uc = IniciarProximaRodada.criar(
      criarMockTorneioGateway({
        buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })),
        atualizarECriarPartidas: jest.fn().mockResolvedValue(false),
      }),
      criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
      criarMockPartidaGateway({
        listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada1),
        listarPorTorneio: jest.fn().mockResolvedValue(partidasRodada1),
      }),
      criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
      {
        executar: jest.fn().mockResolvedValue(Standings.criar({
          torneioId: "t-1", rodada: 1, totalInscritos: 2, jogadores: [],
        })),
      }
    );

    await expect(
      uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false })
    ).rejects.toMatchObject({ status: 409 });
  });
});
