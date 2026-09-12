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
const torneio = (id: string, horario: string, secreto = false, status: "inscricoes_abertas" | "em_andamento" | "finalizado" = "finalizado") => new Torneio({ id, nome: `Torneio ${id}`, horario: new Date(horario), formato: "pauper", donoId: "admin", status, rodadaAtual: 3, totalRodadas: 3, secreto });

describe("BuscarPerfilPublico", () => {
  it("filtra estatísticas e histórico pelas datas, incluindo o fim do dia e paginando após o filtro", async () => {
    const torneios = [torneio("dentro", "2026-08-02T02:59:59.999Z"), torneio("fora", "2026-08-02T03:00:00.000Z")];
    const uc = BuscarPerfilPublico.criar(
      criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
      criarMockDeckGateway({ listar: jest.fn().mockResolvedValue([deckPublico]) }),
      criarMockPartidaGateway({ listarPorDeckIds: jest.fn().mockResolvedValue([partida("dentro", "deck-1", 2, 0), partida("fora", "deck-1", 0, 2)]) }),
      criarMockTorneioGateway({ buscarPorId: jest.fn(id => Promise.resolve(torneios.find(t => t.id === id) ?? null)) }),
      { salvar: jest.fn(), listarPorUsuario: jest.fn().mockResolvedValue([
        { id: "e1", data: "2026-08-01", resultado: "empate" },
        ...Array.from({ length: 12 }, (_, i) => ({ id: `f${i}`, data: "2026-08-02", resultado: "derrota" })),
      ]) },
    );
    const result = await uc.executar({ id: usuario.id, dataInicio: "2026-08-01", dataFim: "2026-08-01", paginaPartidasExternas: 2 });
    expect(result.estatisticas).toMatchObject({ vitorias: 1, derrotas: 0, empates: 1, totalPartidas: 2, winrate: 50 });
    expect(result.ultimosTorneios.map(t => t.id)).toEqual(["dentro"]);
    expect(result.paginacaoPartidasExternas).toMatchObject({ pagina: 1, total: 1, totalPaginas: 1 });
    expect(result.decks).toHaveLength(1);
  });
  it("retorna estatísticas, apenas decks públicos e os três torneios públicos mais recentes", async () => {
    const partidas = [partida("t1", "deck-1", 2, 0), partida("t2", "deck-2", 0, 2), partida("t3", "deck-1", 1, 1), partida("t4", "deck-1", 2, 1), partida("secret", "deck-1", 2, 0), partida("ongoing", "deck-1", 2, 0), partida("open", "deck-1", 2, 0)];
    const torneios = [torneio("t1", "2026-01-01"), torneio("t2", "2026-02-01"), torneio("t3", "2026-03-01"), torneio("t4", "2026-04-01"), torneio("secret", "2026-05-01", true), torneio("ongoing", "2026-06-01", false, "em_andamento"), torneio("open", "2026-07-01", false, "inscricoes_abertas")];
    const uc = BuscarPerfilPublico.criar(
      criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
      criarMockDeckGateway({ listar: jest.fn().mockResolvedValue([deckPublico, deckOculto]) }),
      criarMockPartidaGateway({ listarPorDeckIds: jest.fn().mockResolvedValue(partidas) }),
      criarMockTorneioGateway({ buscarPorId: jest.fn((id) => Promise.resolve(torneios.find((item) => item.id === id) ?? null)) }),
    );

    const resultado = await uc.executar({ id: usuario.id });

    expect(resultado.usuario).toMatchObject({ nome: "Giovani", resultadosExpressivos: 3 });
    expect(resultado.estatisticas).toEqual({ vitorias: 5, derrotas: 1, empates: 1, totalPartidas: 7, winrate: 71.4 });
    expect(resultado.decks).toHaveLength(1);
    expect(resultado.decks[0]).toMatchObject({ id: "deck-1", cartaFundo: "Lightning Bolt" });
    expect(resultado.ultimosTorneios.map((item) => item.id)).toEqual(["t4", "t3", "t2"]);
    expect(resultado.ultimosTorneios.find((item) => item.id === "secret")).toBeUndefined();
    expect(resultado.ultimosTorneios.find((item) => item.id === "ongoing")).toBeUndefined();
    expect(resultado.ultimosTorneios.find((item) => item.id === "open")).toBeUndefined();
  });

  it("exclui torneios sem resultados do jogador antes de selecionar os três mais recentes", async () => {
    const pendente = partida("pendente", "deck-1", 0, 0);
    pendente.status = "pendente";
    const alheia = partida("alheia", "deck-1", 2, 0);
    alheia.jogador1Id = "outro-jogador";
    const bye = partida("bye", "deck-1", 2, 0);
    bye.jogador2Id = null;
    const partidas = [partida("t1", "deck-1", 2, 0), partida("t2", "deck-1", 0, 2), partida("t3", "deck-1", 1, 1), pendente, alheia, bye];
    const torneios = [torneio("t1", "2026-01-01"), torneio("t2", "2026-02-01"), torneio("t3", "2026-03-01"), torneio("pendente", "2026-04-01"), torneio("alheia", "2026-05-01"), torneio("bye", "2026-06-01")];
    const uc = BuscarPerfilPublico.criar(
      criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
      criarMockDeckGateway({ listar: jest.fn().mockResolvedValue([deckPublico]) }),
      criarMockPartidaGateway({ listarPorDeckIds: jest.fn().mockResolvedValue(partidas) }),
      criarMockTorneioGateway({ buscarPorId: jest.fn(id => Promise.resolve(torneios.find(t => t.id === id) ?? null)) }),
    );
    const resultado = await uc.executar({ id: usuario.id });
    expect(resultado.ultimosTorneios.map(t => t.id)).toEqual(["t3", "t2", "t1"]);
    expect(resultado.ultimosTorneios.every(t => t.totalPartidas > 0)).toBe(true);
    expect(resultado.estatisticas).toMatchObject({ vitorias: 1, derrotas: 1, empates: 1, totalPartidas: 3 });
  });

  it("lista partidas externas da mais recente à mais antiga sem misturar torneios", async () => {
    const externas = [
      { id: "a", usuarioId: usuario.id, data: "2026-01-01", resultado: "vitoria", oponente: "Ana" },
      { id: "b", usuarioId: usuario.id, data: "2026-02-01", resultado: "empate" },
    ];
    const listarPorUsuario = jest.fn().mockResolvedValue(externas);
    const uc = BuscarPerfilPublico.criar(criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }), criarMockDeckGateway(), criarMockPartidaGateway(), criarMockTorneioGateway(), { salvar: jest.fn(), listarPorUsuario });
    const resultado = await uc.executar({ id: usuario.id });
    expect(listarPorUsuario).toHaveBeenCalledWith(usuario.id);
    expect(resultado.partidasExternas).toEqual([
      { id: "b", data: "2026-02-01", resultado: "empate" },
      { id: "a", data: "2026-01-01", resultado: "vitoria", oponente: "Ana" },
    ]);
    expect(resultado.ultimosTorneios).toEqual([]);
    expect(resultado.estatisticas.totalPartidas).toBe(2);
    expect(externas[0].id).toBe("a");
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
