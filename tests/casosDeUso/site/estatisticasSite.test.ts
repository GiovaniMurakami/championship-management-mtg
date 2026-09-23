import { BuscarEstatisticasSite } from "../../../src/casosDeUso/site/buscarEstatisticasSite";
import { criarMockInscricaoGateway, criarMockTorneioGateway } from "../../mocks/gateways";

describe("BuscarEstatisticasSite", () => {
  it("deve retornar totais de torneios finalizados, jogadores e premiacao", async () => {
    const uc = BuscarEstatisticasSite.criar(
      criarMockTorneioGateway({
        listar: vi.fn().mockResolvedValue([
          { premio: { tix: 10, playerPoints: 100 } },
          { premio: { tix: 5.5, playerPoints: 50 } },
          { premio: undefined },
        ]),
      }),
      criarMockInscricaoGateway({
        contarJogadoresDistintos: vi.fn().mockResolvedValue(87),
      })
    );

    const resultado = await uc.executar();

    expect(resultado).toEqual({
      torneiosRealizados: 3,
      jogadoresAtivos: 87,
      premiacaoTix: 15.5,
      premiacaoPlayerPoints: 150,
    });
  });
});
