import { DroparJogador } from "../../../src/casosDeUso/torneio/droparJogador";
import { DroparJogadoresSemDeck } from "../../../src/casosDeUso/torneio/droparJogadoresSemDeck";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { criarMockInscricaoGateway, criarMockTorneioGateway } from "../../mocks/gateways";

function criarTorneio() {
  return new Torneio({
    id: "t-1", nome: "Torneio", horario: new Date(), formato: "pauper",
    donoId: "dono-1", status: "inscricoes_abertas",
  });
}

describe("DroparJogadoresSemDeck", () => {
  it("decide no backend e remove apenas inscrições que continuam sem deck", async () => {
    const semDeck = new Inscricao({ id: "i-1", torneioId: "t-1", usuarioId: "u-1" });
    const ganhouDeckDepoisDaLista = new Inscricao({ id: "i-2", torneioId: "t-1", usuarioId: "u-2" });
    const comDeck = new Inscricao({ id: "i-3", torneioId: "t-1", usuarioId: "u-3", deckId: "d-3" });
    const executarDrop = jest.fn().mockResolvedValue({ jogador: { id: "u-1", nome: "Ana" } });
    const inscricaoGateway = criarMockInscricaoGateway({
      listarPorTorneio: jest.fn().mockResolvedValue([semDeck, ganhouDeckDepoisDaLista, comDeck]),
      buscarPorTorneioEUsuario: jest.fn()
        .mockResolvedValueOnce(semDeck)
        .mockResolvedValueOnce(new Inscricao({ ...ganhouDeckDepoisDaLista, deckId: "d-2" })),
    });
    const caso = DroparJogadoresSemDeck.criar(
      criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(criarTorneio()) }),
      inscricaoGateway,
      { executar: executarDrop } as unknown as DroparJogador,
    );

    const resultado = await caso.executar({ torneioId: "t-1", requisitanteId: "dono-1", isAdmin: false });

    expect(executarDrop).toHaveBeenCalledTimes(1);
    expect(executarDrop).toHaveBeenCalledWith(expect.objectContaining({ jogadorId: "u-1" }));
    expect(resultado).toEqual({ totalDropados: 1, jogadores: [{ id: "u-1", nome: "Ana" }] });
  });

  it("recusa requisitante sem permissão", async () => {
    const caso = DroparJogadoresSemDeck.criar(
      criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(criarTorneio()) }),
      criarMockInscricaoGateway(),
      { executar: jest.fn() } as unknown as DroparJogador,
    );

    await expect(caso.executar({ torneioId: "t-1", requisitanteId: "outro", isAdmin: false }))
      .rejects.toMatchObject({ status: 403 });
  });
});
