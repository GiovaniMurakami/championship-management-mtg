import { Ranqueada } from "../../../src/casosDeUso/ranqueada/ranqueada";
import { Partida } from "../../../src/dominio/entidade/partida";
import { EntradaFilaRanqueada, EstadoRanqueado, PartidaRanqueada, RankingRanqueado } from "../../../src/dominio/entidade/ranqueada";
import { RanqueadaGateway } from "../../../src/dominio/gateway/ranqueadaGateway";
import { criarMockDeckGateway, criarMockInscricaoGateway, criarMockPartidaGateway, criarMockUsuarioGateway } from "../../mocks/gateways";

const deck = (id = "deck-a") => ({ id, nome: id, formato: "modern", maindeck: [{ nome: "Island", quantidade: 20 }], sideboard: [], commander: [], usuarioId: "j1", travado: false, torneioId: null });
const ranking = (jogadorId: string, rating = 1000): RankingRanqueado => ({ jogadorId, jogadorNome: jogadorId, formato: "modern", rating, vitorias: 0, derrotas: 0, empates: 0, atualizadoEm: new Date().toISOString() });
const estado = (overrides: Partial<EstadoRanqueado> = {}): EstadoRanqueado => ({ jogadorId: "j1", formato: "modern", vitoriasCampanha: 0, derrotasCampanha: 0, partidasCampanha: 0, partidaId: null, ...overrides });
const partidaRanqueada = (overrides: Partial<PartidaRanqueada> = {}): PartidaRanqueada => ({ id: "partida-1", formato: "modern", jogador1Id: "j1", jogador1Nome: "Nick1", jogador1Divisao: "Prata", jogador2Id: "j2", jogador2Nome: "Nick2", jogador2Divisao: "Prata", deckJogador1Id: "deck-a", deckJogador2Id: "deck-b", deckJogador1: { id: "deck-a", nome: "A", formato: "modern", maindeck: [], sideboard: [], commander: [] }, deckJogador2: { id: "deck-b", nome: "B", formato: "modern", maindeck: [], sideboard: [], commander: [] }, status: "pendente", criadoEm: new Date().toISOString(), ...overrides });
const entradaFila = (jogadorId: string, entrouEm: string): EntradaFilaRanqueada => ({ jogadorId, jogadorNome: jogadorId, deckId: `deck-${jogadorId}`, deckNome: jogadorId, deckSnapshot: { id: `deck-${jogadorId}`, nome: jogadorId, formato: "modern", maindeck: [], sideboard: [], commander: [] }, formato: "modern", vitoriasCampanha: 0, derrotasCampanha: 0, partidasCampanha: 0, ultimoOponenteId: jogadorId === "j1" ? "j2" : "j1", rating: 1000, divisao: "Prata", entrouEm });

function criarRepo(overrides: Partial<RanqueadaGateway> = {}): RanqueadaGateway {
  return {
    buscarRanking: jest.fn().mockResolvedValue(null), buscarEstado: jest.fn().mockResolvedValue(null), buscarPartida: jest.fn().mockResolvedValue(null), buscarEntrada: jest.fn().mockResolvedValue(null), listarFila: jest.fn().mockResolvedValue([]), entrarNaFila: jest.fn().mockResolvedValue(undefined), sairDaFila: jest.fn().mockResolvedValue(undefined), abandonarCampanha: jest.fn().mockResolvedValue(true), parear: jest.fn().mockResolvedValue(false), atualizarPartida: jest.fn().mockResolvedValue(true), contestarPartida: jest.fn().mockResolvedValue(true), finalizar: jest.fn().mockResolvedValue(true), listarRanking: jest.fn().mockResolvedValue([]), listarContestadas: jest.fn().mockResolvedValue([]), listarAguardandoConfirmacao: jest.fn().mockResolvedValue([]), listarHistorico: jest.fn().mockResolvedValue([]), buscarPunicao: jest.fn().mockResolvedValue(null), salvarPunicao: jest.fn().mockResolvedValue(true), ...overrides,
  };
}

function criarServico(repo: RanqueadaGateway, { comVitoria = true } = {}) {
  const inscricoes = criarMockInscricaoGateway({ listarPorUsuario: jest.fn().mockResolvedValue([{ torneioId: "t1", usuarioId: "j1" }]) });
  const resultado = new Partida({ id: "torneio-p1", torneioId: "t1", rodada: 1, jogador1Id: "j1", jogador2Id: "j2", vitoriasJogador1: comVitoria ? 2 : 0, vitoriasJogador2: comVitoria ? 1 : 2, status: "finalizada" });
  return Ranqueada.criar(repo, criarMockDeckGateway({ buscarPorId: jest.fn().mockResolvedValue(deck()) }), criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue({ id: "j1", nome: "Jogador", nickMTGO: "Nick1" }) }), inscricoes, criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([resultado]) }));
}

describe("Ranqueada - regras do caso de uso", () => {
  it("exige ao menos uma vitória real em torneio para entrar na fila", async () => {
    const servico = criarServico(criarRepo(), { comVitoria: false });
    await expect(servico.entrarFila({ jogadorId: "j1", jogadorNome: "Jogador", deckId: "deck-a" })).rejects.toMatchObject({ status: 403 });
  });

  it("não aceita trocar o deck depois que a campanha foi iniciada", async () => {
    const repo = criarRepo({ buscarEstado: jest.fn().mockResolvedValue(estado({ deckCampanhaId: "deck-original", deckCampanhaNome: "Original" })) });
    const decks = criarMockDeckGateway({ buscarPorId: jest.fn().mockResolvedValue(deck("deck-novo")) });
    const servico = Ranqueada.criar(repo, decks, criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue({ id: "j1", nickMTGO: "Nick1" }) }), criarMockInscricaoGateway({ listarPorUsuario: jest.fn().mockResolvedValue([{ torneioId: "t1" }]) }), criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([new Partida({ id: "p", torneioId: "t1", rodada: 1, jogador1Id: "j1", jogador2Id: "j2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" })]) }));
    await expect(servico.entrarFila({ jogadorId: "j1", jogadorNome: "Jogador", deckId: "deck-novo" })).rejects.toMatchObject({ status: 409 });
  });

  it("libera os dois jogadores ao contestar sem aplicar o resultado", async () => {
    const partida = partidaRanqueada({ status: "aguardando_confirmacao", resultadoReportadoPor: "j1", vencedorId: "j1" });
    const repo = criarRepo({ buscarPartida: jest.fn().mockResolvedValue(partida), buscarEstado: jest.fn().mockImplementation((id) => Promise.resolve(estado({ jogadorId: id, partidaId: partida.id, deckCampanhaId: `deck-${id}` }))) });
    const servico = criarServico(repo);
    await servico.contestarResultado({ jogadorId: "j2", partidaId: partida.id, tipoContestacao: "resultado" });
    const estados = (repo.contestarPartida as jest.Mock).mock.calls[0][1] as EstadoRanqueado[];
    expect(estados.map((item) => item.partidaId)).toEqual([null, null]);
    expect(repo.finalizar).not.toHaveBeenCalled();
  });

  it("abandona a campanha, libera o deck e preserva o último adversário", async () => {
    const atual = estado({ vitoriasCampanha: 2, derrotasCampanha: 1, partidasCampanha: 3, deckCampanhaId: "deck-a", deckCampanhaNome: "A", ultimoOponenteId: "j2" });
    const repo = criarRepo({ buscarEstado: jest.fn().mockResolvedValue(atual) });
    const servico = criarServico(repo);
    await servico.abandonarCampanha("j1", "modern");
    const resetado = (repo.abandonarCampanha as jest.Mock).mock.calls[0][0] as EstadoRanqueado;
    expect(resetado).toMatchObject({ partidasCampanha: 0, vitoriasCampanha: 0, derrotasCampanha: 0, deckCampanhaId: null, ultimoOponenteId: "j2" });
  });

  it("encerra e libera o deck exatamente na quinta partida", async () => {
    const partida = partidaRanqueada({ status: "aguardando_confirmacao", resultadoReportadoPor: "j2", vencedorId: "j1" });
    const repo = criarRepo({ buscarPartida: jest.fn().mockResolvedValue(partida), buscarRanking: jest.fn().mockImplementation((id) => Promise.resolve(ranking(id))), buscarEstado: jest.fn().mockImplementation((id) => Promise.resolve(estado({ jogadorId: id, partidasCampanha: 4, vitoriasCampanha: 3, derrotasCampanha: 1, partidaId: partida.id, deckCampanhaId: `deck-${id}` }))) });
    const servico = criarServico(repo);
    await servico.confirmarResultado({ jogadorId: "j1", partidaId: partida.id });
    const estados = (repo.finalizar as jest.Mock).mock.calls[0][2] as EstadoRanqueado[];
    expect(estados).toHaveLength(2);
    expect(estados.every((item) => item.partidasCampanha === 0 && item.deckCampanhaId === null)).toBe(true);
  });

  it("só permite revanche depois de ambos aguardarem 30 segundos", async () => {
    const agora = Date.now();
    const minhaEntrada = entradaFila("j1", new Date(agora - 10_000).toISOString());
    const adversario = entradaFila("j2", new Date(agora - 40_000).toISOString());
    const repo = criarRepo({ buscarEntrada: jest.fn().mockResolvedValue(minhaEntrada), listarFila: jest.fn().mockResolvedValue([minhaEntrada, adversario]), buscarEstado: jest.fn().mockResolvedValue(estado()), buscarRanking: jest.fn().mockResolvedValue(ranking("j1")), parear: jest.fn().mockResolvedValue(true) });
    const servico = criarServico(repo);
    await servico.status("j1", "modern");
    expect(repo.parear).not.toHaveBeenCalled();

    minhaEntrada.entrouEm = new Date(agora - 31_000).toISOString();
    await servico.status("j1", "modern");
    expect(repo.parear).toHaveBeenCalledTimes(1);
  });
});
