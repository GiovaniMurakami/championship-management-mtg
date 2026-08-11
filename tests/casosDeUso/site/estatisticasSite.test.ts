import { BuscarEstatisticasSite } from "../../../src/casosDeUso/site/buscarEstatisticasSite";
import { criarMockInscricaoGateway, criarMockTorneioGateway } from "../../mocks/gateways";

describe("BuscarEstatisticasSite", () => {
  it("deve retornar totais de torneios finalizados e jogadores distintos", async () => {
    const uc = BuscarEstatisticasSite.criar(
      criarMockTorneioGateway({
        listarTotal: jest.fn().mockResolvedValue(12),
      }),
      criarMockInscricaoGateway({
        contarJogadoresDistintos: jest.fn().mockResolvedValue(87),
      })
    );

    const resultado = await uc.executar();

    expect(resultado).toEqual({
      torneiosRealizados: 12,
      jogadoresAtivos: 87,
      formatosSuportados: 6,
    });
  });
});
