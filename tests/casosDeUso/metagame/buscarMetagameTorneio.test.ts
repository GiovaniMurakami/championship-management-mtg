import { BuscarMetagameTorneio } from "../../../src/casosDeUso/metagame/buscarMetagameTorneio";
import {
  criarMockTorneioGateway,
  criarMockInscricaoGateway,
  criarMockPartidaGateway,
  criarMockDeckGateway,
  criarMockUsuarioGateway,
} from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { Partida } from "../../../src/dominio/entidade/partida";
import { StatusErro } from "../../../src/helpers/error/statusErro";

function torneio(props: Partial<ConstructorParameters<typeof Torneio>[0]> = {}) {
  return new Torneio({
    id: "t1",
    nome: "Pauper Semanal",
    horario: new Date("2026-04-01T20:00:00.000Z"),
    formato: "pauper",
    donoId: "admin",
    status: "finalizado",
    rodadaAtual: 3,
    totalRodadas: 3,
    ...props,
  });
}

describe("BuscarMetagameTorneio", () => {
  const alice = new Usuario({ id: "u1", nome: "Alice", email: "a@a.com", senha: "x", role: "user" });
  const bob = new Usuario({ id: "u2", nome: "Bob", email: "b@b.com", senha: "x", role: "user" });
  const terror = new Deck({
    id: "d1",
    nome: "Terror",
    nomeConsolidado: "Tolarian Terror",
    usuarioId: "u1",
    formato: "pauper",
    maindeck: [{ nome: "Tolarian Terror", quantidade: 4 }],
    sideboard: [],
  });
  const bogles = new Deck({
    id: "d2",
    nome: "Bogles",
    usuarioId: "u2",
    formato: "pauper",
    maindeck: [{ nome: "Slippery Bogle", quantidade: 4 }],
    sideboard: [],
  });

  it("agrega metagame de um torneio finalizado", async () => {
    const t = torneio();
    const uc = BuscarMetagameTorneio.criar(
      criarMockTorneioGateway({ buscarPorId: vi.fn().mockResolvedValue(t) }),
      criarMockInscricaoGateway({
        listarPorTorneio: vi.fn().mockResolvedValue([
          new Inscricao({ id: "i1", torneioId: "t1", usuarioId: "u1", deckId: "d1", checkInRodada: -1, dropped: false }),
          new Inscricao({ id: "i2", torneioId: "t1", usuarioId: "u2", deckId: "d2", checkInRodada: -1, dropped: false }),
        ]),
      }),
      criarMockPartidaGateway({
        listarPorTorneio: vi.fn().mockResolvedValue([
          new Partida({
            id: "p1",
            torneioId: "t1",
            rodada: 1,
            jogador1Id: "u1",
            jogador2Id: "u2",
            deckJogador1Id: "d1",
            deckJogador2Id: "d2",
            gamesJogador1: 2,
            gamesJogador2: 0,
            status: "finalizada",
          }),
        ]),
      }),
      criarMockDeckGateway({ buscarVarios: vi.fn().mockResolvedValue([terror, bogles]) }),
      criarMockUsuarioGateway({ buscarVarios: vi.fn().mockResolvedValue([alice, bob]) }),
    );

    const resultado = await uc.executar({ torneioId: "t1" });

    expect(resultado.torneio.nome).toBe("Pauper Semanal");
    expect(resultado.totalDecks).toBe(2);
    expect(resultado.arquetipos.length).toBeGreaterThanOrEqual(2);
    expect(resultado.arquetipos.every((a) => Array.isArray(a.matchups))).toBe(true);
  });

  it("inclui torneio secreto quando buscado por id", async () => {
    const t = torneio({ secreto: true });
    const uc = BuscarMetagameTorneio.criar(
      criarMockTorneioGateway({ buscarPorId: vi.fn().mockResolvedValue(t) }),
      criarMockInscricaoGateway({
        listarPorTorneio: vi.fn().mockResolvedValue([
          new Inscricao({ id: "i1", torneioId: "t1", usuarioId: "u1", deckId: "d1", checkInRodada: -1, dropped: false }),
        ]),
      }),
      criarMockPartidaGateway({ listarPorTorneio: vi.fn().mockResolvedValue([]) }),
      criarMockDeckGateway({ buscarVarios: vi.fn().mockResolvedValue([terror]) }),
      criarMockUsuarioGateway({ buscarVarios: vi.fn().mockResolvedValue([alice]) }),
    );

    const resultado = await uc.executar({ torneioId: "t1" });

    expect(resultado.torneio.secreto).toBe(true);
    expect(resultado.totalDecks).toBe(1);
  });

  it("retorna 404 quando torneio não existe", async () => {
    const uc = BuscarMetagameTorneio.criar(
      criarMockTorneioGateway({ buscarPorId: vi.fn().mockResolvedValue(null) }),
      criarMockInscricaoGateway(),
      criarMockPartidaGateway(),
      criarMockDeckGateway(),
      criarMockUsuarioGateway(),
    );

    await expect(uc.executar({ torneioId: "x" })).rejects.toMatchObject({ status: StatusErro.erroNaoEncontrado });
  });

  it("recusa torneio não finalizado", async () => {
    const uc = BuscarMetagameTorneio.criar(
      criarMockTorneioGateway({
        buscarPorId: vi.fn().mockResolvedValue(torneio({ status: "em_andamento" })),
      }),
      criarMockInscricaoGateway(),
      criarMockPartidaGateway(),
      criarMockDeckGateway(),
      criarMockUsuarioGateway(),
    );

    await expect(uc.executar({ torneioId: "t1" })).rejects.toMatchObject({ status: StatusErro.erroParametro });
  });
});
