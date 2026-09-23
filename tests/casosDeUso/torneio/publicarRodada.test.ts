import { PublicarRodada } from "../../../src/casosDeUso/torneio/publicarRodada";
import { criarMockPartidaGateway, criarMockTorneioGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Partida } from "../../../src/dominio/entidade/partida";
import { eventosTorneio } from "../../../src/infra/socketio/eventosTorneio";

describe("PublicarRodada", () => {
  it("publica a rodada e emite rodada_iniciada", async () => {
    const torneio = new Torneio({
      id: "t-1", nome: "T", horario: new Date(), formato: "legacy", donoId: "dono-1",
      status: "em_andamento", rodadaAtual: 1, totalRodadas: 3, rodadaPublicada: false,
    });
    const partidas = [
      new Partida({
        id: "p-1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2",
        vitoriasJogador1: 0, vitoriasJogador2: 0, status: "pendente",
      }),
    ];
    const torneioGw = criarMockTorneioGateway({ buscarPorId: vi.fn().mockResolvedValue(torneio) });
    const uc = PublicarRodada.criar(
      torneioGw,
      criarMockPartidaGateway({ listarPorTorneioERodada: vi.fn().mockResolvedValue(partidas) }),
      criarMockUsuarioGateway({ buscarVarios: vi.fn().mockResolvedValue([{ id: "u-1", nome: "A" }, { id: "u-2", nome: "B" }]) }),
    );
    const emitSpy = vi.spyOn(eventosTorneio, "emit");

    const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false });

    expect(resultado.rodadaPublicada).toBe(true);
    expect(torneioGw.atualizar).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith("rodada_iniciada", expect.objectContaining({ torneioId: "t-1" }));
    emitSpy.mockRestore();
  });

  it("rejeita se a rodada já está publicada", async () => {
    const torneio = new Torneio({
      id: "t-1", nome: "T", horario: new Date(), formato: "legacy", donoId: "dono-1",
      status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
    });
    const uc = PublicarRodada.criar(
      criarMockTorneioGateway({ buscarPorId: vi.fn().mockResolvedValue(torneio) }),
      criarMockPartidaGateway(),
      criarMockUsuarioGateway(),
    );

    await expect(uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false }))
      .rejects.toMatchObject({ status: 400 });
  });
});
