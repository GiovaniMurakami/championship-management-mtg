import { RegistrarPartidaExterna } from "../../../src/casosDeUso/usuario/registrarPartidaExterna";
import { BuscarPerfilPublico } from "../../../src/casosDeUso/usuario/buscarPerfilPublico";
import { PartidaExterna, PartidaExternaGateway } from "../../../src/dominio/gateway/partidaExternaGateway";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { criarMockUsuarioGateway, criarMockDeckGateway, criarMockPartidaGateway, criarMockTorneioGateway } from "../../mocks/gateways";

describe("Partidas externas do perfil", () => {
  const usuario = new Usuario({ id: "u1", nome: "Jogador", email: "j@example.com", senha: "hash" });
  const usuarios = criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) });
  let registros: PartidaExterna[];
  let externas: PartidaExternaGateway;
  beforeEach(() => {
    registros = [];
    externas = {
      salvar: jest.fn(async (partida) => { registros.push(partida); }),
      listarPorUsuario: jest.fn(async (id) => registros.filter((p) => p.usuarioId === id)),
    };
  });
  it("registra vitória, derrota e empate apenas para o perfil autenticado", async () => {
    const registrar = RegistrarPartidaExterna.criar(externas, usuarios);
    for (const resultado of ["vitoria", "derrota", "empate"]) {
      await registrar.executar("u1", { resultado, data: "2026-01-01", usuarioId: "outro" });
    }
    expect(registros.every((p) => p.usuarioId === "u1")).toBe(true);
    const torneios = criarMockTorneioGateway();
    const perfil = await BuscarPerfilPublico.criar(usuarios, criarMockDeckGateway(), criarMockPartidaGateway(), torneios, externas).executar({ id: "u1" });
    expect(perfil.estatisticas).toEqual({ vitorias: 1, derrotas: 1, empates: 1, totalPartidas: 3, winrate: 33.3 });
    expect(perfil.ultimosTorneios).toEqual([]);
    expect(perfil.decks).toEqual([]);
    expect(torneios.buscarPorId).not.toHaveBeenCalled();
    const outro = await BuscarPerfilPublico.criar(usuarios, criarMockDeckGateway(), criarMockPartidaGateway(), torneios, externas).executar({ id: "outro" });
    expect(outro.estatisticas.totalPartidas).toBe(0);
  });
  it("pagina o histórico sem limitar as estatísticas e preserva os decks", async () => {
    const registrar = RegistrarPartidaExterna.criar(externas, usuarios);
    for (let i = 1; i <= 12; i++) {
      await registrar.executar("u1", { resultado: "vitoria", data: `2026-01-${String(i).padStart(2, "0")}`, campeonato: " Liga local ", deckNome: " Burn ", deckAdversarioNome: " Affinity " });
    }
    const buscar = BuscarPerfilPublico.criar(usuarios, criarMockDeckGateway(), criarMockPartidaGateway(), criarMockTorneioGateway(), externas);
    const primeira = await buscar.executar({ id: "u1" });
    const segunda = await buscar.executar({ id: "u1", paginaPartidasExternas: 2 });
    expect(primeira.partidasExternas).toHaveLength(10);
    expect(segunda.partidasExternas).toHaveLength(2);
    expect(primeira.partidasExternas[0]).toMatchObject({ data: "2026-01-12", campeonato: "Liga local", deckNome: "Burn", deckAdversarioNome: "Affinity" });
    expect(segunda.estatisticas).toEqual(primeira.estatisticas);
    expect(segunda.estatisticas.totalPartidas).toBe(12);
    expect(segunda.paginacaoPartidasExternas).toEqual({ pagina: 2, totalPaginas: 2, limite: 10, total: 12 });
    const ids = [...primeira.partidasExternas, ...segunda.partidasExternas].map(p => p.id);
    expect(new Set(ids).size).toBe(12);
    await expect(buscar.executar({ id: "u1", paginaPartidasExternas: -1 })).rejects.toMatchObject({ status: 400 });
  });

  it("prioriza o cadastro recente mesmo quando a partida foi jogada antes", async () => {
    registros = [
      { id: "a", usuarioId: "u1", resultado: "vitoria", data: "2026-05-01", criadoEm: "2026-06-01T10:00:00.000Z" },
      { id: "b", usuarioId: "u1", resultado: "derrota", data: "2026-01-01", criadoEm: "2026-06-02T10:00:00.000Z" },
      { id: "legado", usuarioId: "u1", resultado: "empate", data: "2026-06-03" },
    ];
    const perfil = await BuscarPerfilPublico.criar(usuarios, criarMockDeckGateway(), criarMockPartidaGateway(), criarMockTorneioGateway(), externas).executar({ id: "u1" });
    expect(perfil.partidasExternas.map(p => p.id)).toEqual(["b", "a", "legado"]);
  });

  it("define a data de cadastro no servidor", async () => {
    const partida = await RegistrarPartidaExterna.criar(externas, usuarios).executar("u1", { resultado: "vitoria", data: "2026-01-01", criadoEm: "2099-01-01" });
    expect(partida.criadoEm).not.toBe("2099-01-01");
    expect(Number.isFinite(Date.parse(partida.criadoEm))).toBe(true);
  });

  it.each([
    { resultado: "vitoria", data: "2026-01-01", campeonato: "x".repeat(151) },
    { resultado: "vitoria", data: "2026-01-01", deckNome: " " },
    { resultado: "vitoria", data: "2026-01-01", deckAdversarioNome: "x".repeat(101) },
    { resultado: "invalido", data: "2026-01-01" },
    { resultado: "vitoria", data: "2026-02-30" },
    { resultado: "vitoria", data: "2999-01-01" },
    { resultado: "vitoria" },
  ])("rejeita dados inválidos sem persistir: %j", async (input) => {
    await expect(RegistrarPartidaExterna.criar(externas, usuarios).executar("u1", input)).rejects.toMatchObject({ status: 400 });
    expect(externas.salvar).not.toHaveBeenCalled();
  });
  it("não permite registrar para usuário excluído", async () => {
    const gateway = criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(null) });
    await expect(RegistrarPartidaExterna.criar(externas, gateway).executar("u1", { resultado: "vitoria", data: "2026-01-01" })).rejects.toMatchObject({ status: 404 });
    expect(externas.salvar).not.toHaveBeenCalled();
  });
});
