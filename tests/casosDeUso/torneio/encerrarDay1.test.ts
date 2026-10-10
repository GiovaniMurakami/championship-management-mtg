import { EncerrarDay1 } from "../../../src/casosDeUso/torneio/encerrarDay1";
import {
  criarMockTorneioGateway,
  criarMockInscricaoGateway,
  criarMockPartidaGateway,
  criarMockUsuarioGateway,
} from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { StatusErro } from "../../../src/helpers/error/statusErro";

function torneioDay1(props: Partial<ConstructorParameters<typeof Torneio>[0]> = {}) {
  return new Torneio({
    id: "t-1",
    nome: "Super Pauper",
    horario: new Date(),
    formato: "pauper",
    donoId: "dono",
    status: "em_andamento",
    rodadaAtual: 2,
    totalRodadas: 5,
    rodadasDay1: 2,
    vagasDay2: 2,
    rodadaPublicada: true,
    ...props,
  });
}

describe("EncerrarDay1", () => {
  const inscricoes = [
    new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 2, dropped: false }),
    new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 2, dropped: false }),
    new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 2, dropped: false }),
    new Inscricao({ id: "i4", torneioId: "t-1", usuarioId: "u-4", checkInRodada: 2, dropped: false }),
  ];

  const partidas = [
    new Partida({
      id: "p1", torneioId: "t-1", rodada: 1,
      jogador1Id: "u-1", jogador2Id: "u-2",
      vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada",
    }),
    new Partida({
      id: "p2", torneioId: "t-1", rodada: 1,
      jogador1Id: "u-3", jogador2Id: "u-4",
      vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada",
    }),
    new Partida({
      id: "p3", torneioId: "t-1", rodada: 2,
      jogador1Id: "u-1", jogador2Id: "u-3",
      vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada",
    }),
    new Partida({
      id: "p4", torneioId: "t-1", rodada: 2,
      jogador1Id: "u-2", jogador2Id: "u-4",
      vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada",
    }),
  ];

  const usuarios = [
    new Usuario({ id: "u-1", nome: "A", email: "a@a.com", senha: "x" }),
    new Usuario({ id: "u-2", nome: "B", email: "b@b.com", senha: "x" }),
    new Usuario({ id: "u-3", nome: "C", email: "c@c.com", senha: "x" }),
    new Usuario({ id: "u-4", nome: "D", email: "d@d.com", senha: "x" }),
  ];

  it("classifica top vagasDay2 e dropa o restante", async () => {
    const t = torneioDay1();
    const inscricoesMutaveis = inscricoes.map((i) => new Inscricao({ ...i }));
    const inscricaoGw = criarMockInscricaoGateway({
      listarPorTorneio: vi.fn().mockResolvedValue(inscricoesMutaveis),
      atualizar: vi.fn(),
    });
    const torneioGw = criarMockTorneioGateway({
      buscarPorId: vi.fn().mockResolvedValue(t),
      atualizar: vi.fn(),
    });

    const uc = EncerrarDay1.criar(
      torneioGw,
      inscricaoGw,
      criarMockPartidaGateway({ listarPorTorneio: vi.fn().mockResolvedValue(partidas) }),
      criarMockUsuarioGateway({ buscarVarios: vi.fn().mockResolvedValue(usuarios) }),
    );

    const resultado = await uc.executar({
      torneioId: "t-1",
      requisitanteId: "dono",
      isAdmin: false,
    });

    expect(resultado.classificados).toBe(2);
    expect(resultado.dropados).toBe(2);
    expect(resultado.day1Encerrado).toBe(true);
    expect(resultado.jogadoresClassificados[0].id).toBe("u-1");
    expect(inscricaoGw.atualizar).toHaveBeenCalledTimes(2);
    expect(torneioGw.atualizar).toHaveBeenCalled();
    expect(t.day1Encerrado).toBe(true);
  });

  it("bloqueia se Day 1 já encerrado", async () => {
    const uc = EncerrarDay1.criar(
      criarMockTorneioGateway({
        buscarPorId: vi.fn().mockResolvedValue(torneioDay1({ day1Encerrado: true })),
      }),
      criarMockInscricaoGateway(),
      criarMockPartidaGateway(),
      criarMockUsuarioGateway(),
    );

    await expect(
      uc.executar({ torneioId: "t-1", requisitanteId: "dono", isAdmin: false }),
    ).rejects.toMatchObject({ status: StatusErro.erroParametro });
  });

  it("bloqueia se não estiver na última rodada do Day 1", async () => {
    const uc = EncerrarDay1.criar(
      criarMockTorneioGateway({
        buscarPorId: vi.fn().mockResolvedValue(torneioDay1({ rodadaAtual: 1 })),
      }),
      criarMockInscricaoGateway(),
      criarMockPartidaGateway(),
      criarMockUsuarioGateway(),
    );

    await expect(
      uc.executar({ torneioId: "t-1", requisitanteId: "dono", isAdmin: false }),
    ).rejects.toMatchObject({ status: StatusErro.erroParametro });
  });

  it("bloqueia se houver partidas pendentes", async () => {
    const pendentes = [
      ...partidas.slice(0, 3),
      new Partida({
        id: "p4", torneioId: "t-1", rodada: 2,
        jogador1Id: "u-2", jogador2Id: "u-4",
        vitoriasJogador1: 0, vitoriasJogador2: 0, status: "pendente",
      }),
    ];
    const uc = EncerrarDay1.criar(
      criarMockTorneioGateway({ buscarPorId: vi.fn().mockResolvedValue(torneioDay1()) }),
      criarMockInscricaoGateway({ listarPorTorneio: vi.fn().mockResolvedValue(inscricoes) }),
      criarMockPartidaGateway({ listarPorTorneio: vi.fn().mockResolvedValue(pendentes) }),
      criarMockUsuarioGateway(),
    );

    await expect(
      uc.executar({ torneioId: "t-1", requisitanteId: "dono", isAdmin: false }),
    ).rejects.toMatchObject({ status: StatusErro.erroParametro });
  });

  it("bloqueia sem permissão", async () => {
    const uc = EncerrarDay1.criar(
      criarMockTorneioGateway({ buscarPorId: vi.fn().mockResolvedValue(torneioDay1()) }),
      criarMockInscricaoGateway(),
      criarMockPartidaGateway(),
      criarMockUsuarioGateway(),
    );

    await expect(
      uc.executar({ torneioId: "t-1", requisitanteId: "outro", isAdmin: false }),
    ).rejects.toMatchObject({ status: StatusErro.erroProibido });
  });
});
