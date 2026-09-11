import { ExportarMtggoldfish } from "../../../src/casosDeUso/torneio/exportarMtggoldfish";
import { BuscarStandings } from "../../../src/casosDeUso/torneio/buscarStandings";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import {
  criarMockDeckGateway,
  criarMockInscricaoGateway,
  criarMockTorneioGateway,
  criarMockUsuarioGateway,
} from "../../mocks/gateways";

describe("ExportarMtggoldfish", () => {
  const torneioFinalizado = new Torneio({
    id: "12345678-1234-4234-9234-123456789abc",
    nome: "Pauper Semanal",
    horario: new Date("2026-09-10T22:00:00.000Z"),
    formato: "pauper",
    donoId: "owner-1",
    status: "finalizado",
    rodadaAtual: 3,
    totalRodadas: 3,
    exibirNomeJogador: "nickMOL",
  });

  const criarUc = (overrides: {
    torneio?: Torneio | null;
    standings?: Awaited<ReturnType<BuscarStandings["executar"]>>;
    inscricoes?: Inscricao[];
    usuarios?: Usuario[];
    decks?: Deck[];
  } = {}) => {
    const buscarStandings = {
      executar: jest.fn().mockResolvedValue(overrides.standings ?? {
        torneioId: torneioFinalizado.id,
        rodadaAtual: 3,
        totalRodadas: 3,
        status: "finalizado",
        totalInscritos: 1,
        standings: [{
          posicao: 1,
          usuario: { id: "u-1", nome: "Alice", excluido: false, resultadosExpressivos: 0 },
          time: null,
          pontosMesa: 9,
          vitoriasPartida: 3,
          empatesPartida: 0,
          derrotasPartida: 0,
          mwp: 1,
          omwp: 0.5,
          gwp: 1,
          ogwp: 0.5,
          checkInRodada: 1,
          deckId: "deck-1",
          deckNome: "Mono Red",
          dropped: false,
          droppedRodada: null,
          resultadosExpressivos: 0,
        }],
      }),
    } as unknown as BuscarStandings;

    return ExportarMtggoldfish.criar(
      criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(overrides.torneio ?? torneioFinalizado) }),
      criarMockInscricaoGateway({
        listarPorTorneio: jest.fn().mockResolvedValue(overrides.inscricoes ?? [
          new Inscricao({ id: "i-1", torneioId: torneioFinalizado.id, usuarioId: "u-1", deckId: "deck-1", checkInRodada: 1 }),
        ]),
      }),
      criarMockUsuarioGateway({
        buscarVarios: jest.fn().mockResolvedValue(overrides.usuarios ?? [
          new Usuario({ id: "u-1", nome: "Alice Nome", email: "a@example.com", senha: "x", nickMTGO: "AliceMTGO" }),
        ]),
      }),
      criarMockDeckGateway({
        buscarVarios: jest.fn().mockResolvedValue(overrides.decks ?? [
          new Deck({
            id: "deck-1",
            nome: "Mono Red Burn",
            nomeConsolidado: "Mono Red",
            formato: "pauper",
            usuarioId: "u-1",
            maindeck: [{ quantidade: 4, nome: "Lightning Bolt" }],
            sideboard: [{ quantidade: 2, nome: "Pyroblast" }],
          }),
        ]),
      }),
      buscarStandings
    );
  };

  it("exporta listas e texto de submissao para torneio finalizado", async () => {
    const resultado = await criarUc().executar({ torneioId: torneioFinalizado.id });

    expect(resultado.provider).toBe("mtggoldfish");
    expect(resultado.tournament.name).toBe("Pauper Semanal");
    expect(resultado.tournament.decklists).toBe(1);
    expect(resultado.decklists[0]).toMatchObject({
      rank: 1,
      player: { name: "AliceMTGO", mtgoUsername: "AliceMTGO" },
      result: "3-0",
      deck: {
        name: "Mono Red Burn",
        archetype: "Mono Red",
        mainboard: [{ count: 4, cardName: "Lightning Bolt" }],
      },
    });
    expect(resultado.submissionText).toContain("#1 AliceMTGO - Mono Red (3-0)");
    expect(resultado.submissionText).toContain("4 Lightning Bolt");
  });

  it("bloqueia torneio ainda nao finalizado", async () => {
    const torneioAberto = new Torneio({
      ...torneioFinalizado,
      status: "inscricoes_abertas",
      rodadaAtual: 0,
      totalRodadas: 0,
    });

    await expect(criarUc({ torneio: torneioAberto }).executar({ torneioId: torneioAberto.id }))
      .rejects.toMatchObject({ status: 400 });
  });

  it("bloqueia torneio secreto", async () => {
    const torneioSecreto = new Torneio({
      ...torneioFinalizado,
      secreto: true,
    });

    await expect(criarUc({ torneio: torneioSecreto }).executar({ torneioId: torneioSecreto.id }))
      .rejects.toMatchObject({ status: 403 });
  });
});
