import { DroparJogador } from "../../../src/casosDeUso/torneio/droparJogador";
import { DroparJogadoresSemCheckin } from "../../../src/casosDeUso/torneio/droparJogadoresSemCheckin";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { criarMockInscricaoGateway, criarMockTorneioGateway } from "../../mocks/gateways";

function criarTorneio(status: "inscricoes_abertas" | "em_andamento" = "em_andamento") {
  return new Torneio({
    id: "t-1", nome: "Torneio", horario: new Date(), formato: "pauper",
    donoId: "dono-1", status, rodadaAtual: status === "em_andamento" ? 2 : 0,
  });
}

describe("DroparJogadoresSemCheckin", () => {
  it("relê o check-in e preserva quem confirmou após a listagem", async () => {
    const pendente = new Inscricao({ id: "i-1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1 });
    const confirmouDepois = new Inscricao({ id: "i-2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1 });
    const executarDrop = jest.fn().mockResolvedValue({ jogador: { id: "u-1", nome: "Ana" } });
    const caso = DroparJogadoresSemCheckin.criar(
      criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(criarTorneio()) }),
      criarMockInscricaoGateway({
        listarPorTorneio: jest.fn().mockResolvedValue([pendente, confirmouDepois]),
        buscarPorTorneioEUsuario: jest.fn()
          .mockResolvedValueOnce(pendente)
          .mockResolvedValueOnce(new Inscricao({ ...confirmouDepois, checkInRodada: 2 })),
      }),
      { executar: executarDrop } as unknown as DroparJogador,
    );

    const resultado = await caso.executar({ torneioId: "t-1", requisitanteId: "dono-1", isAdmin: false });

    expect(executarDrop).toHaveBeenCalledTimes(1);
    expect(executarDrop).toHaveBeenCalledWith(expect.objectContaining({ jogadorId: "u-1" }));
    expect(resultado.totalDropados).toBe(1);
  });

  it("no check-in inicial considera pendente apenas valor menor que zero", async () => {
    const semCheckin = new Inscricao({ id: "i-1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: -1 });
    const comCheckin = new Inscricao({ id: "i-2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 0 });
    const executarDrop = jest.fn().mockResolvedValue({ jogador: { id: "u-1", nome: "Ana" } });
    const caso = DroparJogadoresSemCheckin.criar(
      criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(criarTorneio("inscricoes_abertas")) }),
      criarMockInscricaoGateway({
        listarPorTorneio: jest.fn().mockResolvedValue([semCheckin, comCheckin]),
        buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(semCheckin),
      }),
      { executar: executarDrop } as unknown as DroparJogador,
    );

    await caso.executar({ torneioId: "t-1", requisitanteId: "dono-1", isAdmin: false });
    expect(executarDrop).toHaveBeenCalledTimes(1);
  });
});
