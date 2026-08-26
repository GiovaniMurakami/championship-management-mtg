import { BuscarPerfilPublico } from "../../../src/casosDeUso/usuario/buscarPerfilPublico";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { criarMockDeckGateway, criarMockPartidaGateway, criarMockTorneioGateway, criarMockUsuarioGateway } from "../../mocks/gateways";

const usuario = new Usuario({ id: "user-1", nome: "Giovani", email: "g@x.com", senha: "hash", resultadosExpressivos: 3, fotoUrl: "https://example.com/foto.jpg", criadoEm: new Date("2026-03-09") });
const deckPublico = new Deck({ id: "deck-1", nome: "Pauper", formato: "pauper", usuarioId: usuario.id, cartaRepresentativa: "Lightning Bolt", maindeck: [{ nome: "Mountain", quantidade: 20 }], sideboard: [] });
const deckOculto = new Deck({ id: "deck-2", nome: "Segredo", formato: "pauper", usuarioId: usuario.id, oculto: true, maindeck: [{ nome: "Island", quantidade: 20 }], sideboard: [] });

const partida = (torneioId: string, deckId: string, v1: number, v2: number) => new Partida({ id: `${torneioId}-${deckId}`, torneioId, rodada: 1, jogador1Id: usuario.id, jogador2Id: "opponent", deckJogador1Id: deckId, vitoriasJogador1: v1, vitoriasJogador2: v2, status: "finalizada" });
const torneio = (id: string, horario: string, secreto = false) => new Torneio({ id, nome: `Torneio ${id}`, horario: new Date(horario), formato: "pauper", donoId: "admin", status: "finalizado", rodadaAtual: 3, totalRodadas: 3, secreto });

describe("BuscarPerfilPublico", () => {
  it("retorna estatísticas, apenas decks públicos e os três torneios públicos mais recentes", async () => {
    const partidas = [partida("t1", "deck-1", 2, 0), partida("t2", "deck-2", 0, 2), partida("t3", "deck-1", 1, 1), partida("t4", "deck-1", 2, 1), partida("secret", "deck-1", 2, 0)];
    const torneios = [torneio("t1", "2026-01-01"), torneio("t2", "2026-02-01"), torneio("t3", "2026-03-01"), torneio("t4", "2026-04-01"), torneio("secret", "2026-05-01", true)];
    const uc = BuscarPerfilPublico.criar(
      criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
      criarMockDeckGateway({ listar: jest.fn().mockResolvedValue([deckPublico, deckOculto]) }),
      criarMockPartidaGateway({ listarPorDeckIds: jest.fn().mockResolvedValue(partidas) }),
      criarMockTorneioGateway({ buscarPorId: jest.fn((id) => Promise.resolve(torneios.find((item) => item.id === id) ?? null)) }),
    );

    const resultado = await uc.executar({ id: usuario.id });

    expect(resultado.usuario).toMatchObject({ nome: "Giovani", resultadosExpressivos: 3 });
    expect(resultado.estatisticas).toEqual({ vitorias: 3, derrotas: 1, empates: 1, totalPartidas: 5, winrate: 60 });
    expect(resultado.decks).toHaveLength(1);
    expect(resultado.decks[0]).toMatchObject({ id: "deck-1", cartaFundo: "Lightning Bolt" });
    expect(resultado.ultimosTorneios.map((item) => item.id)).toEqual(["t4", "t3", "t2"]);
    expect(resultado.ultimosTorneios.find((item) => item.id === "secret")).toBeUndefined();
  });

  it("não contabiliza BYE", async () => {
    const bye = new Partida({ id: "bye", torneioId: "t1", rodada: 1, jogador1Id: usuario.id, jogador2Id: null, deckJogador1Id: deckPublico.id, vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" });
    const uc = BuscarPerfilPublico.criar(criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }), criarMockDeckGateway({ listar: jest.fn().mockResolvedValue([deckPublico]) }), criarMockPartidaGateway({ listarPorDeckIds: jest.fn().mockResolvedValue([bye]) }), criarMockTorneioGateway());
    expect((await uc.executar({ id: usuario.id })).estatisticas.totalPartidas).toBe(0);
  });

  it("retorna 404 para usuário inexistente ou excluído", async () => {
    const uc = BuscarPerfilPublico.criar(criarMockUsuarioGateway(), criarMockDeckGateway(), criarMockPartidaGateway(), criarMockTorneioGateway());
    await expect(uc.executar({ id: "missing" })).rejects.toMatchObject({ status: 404 });
  });
});
