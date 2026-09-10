import { ListarMetagame } from "../../../src/casosDeUso/metagame/listarMetagame";
import { carregarEAgregarMetagame } from "../../../src/casosDeUso/metagame/carregarMetagame";
import { CacheDynamoDbServico } from "../../../src/infra/services/cacheDynamoDbServico";
import { criarMockTorneioGateway, criarMockInscricaoGateway, criarMockPartidaGateway, criarMockDeckGateway, criarMockUsuarioGateway } from "../../mocks/gateways";

jest.mock("../../../src/casosDeUso/metagame/carregarMetagame", () => ({ carregarEAgregarMetagame: jest.fn() }));

it("retorna todos os confrontos em uma agregação e reutiliza o cache versionado sem listas completas", async () => {
  const burn = { slug: "burn", nome: "Burn" };
  const terror = { slug: "terror", nome: "Terror" };
  const matchups = [{ slug: "terror", nome: "Terror", vitorias: 2, derrotas: 1, empates: 1, partidas: 4, winrate: 50 }];
  (carregarEAgregarMetagame as jest.Mock).mockResolvedValue({
    formato: "pauper", dias: 30, totalDecks: 2, totalTorneios: 1,
    arquetipos: [burn, terror], recentes: [],
    porSlug: new Map([
      ["burn", { ...burn, matchups, listas: [{ maindeck: ["large deck"] }] }],
      ["terror", { ...terror, matchups: [], listas: [] }],
    ]),
  });
  const cache = { obterVersao: jest.fn().mockResolvedValue(1), buscar: jest.fn().mockResolvedValue(null), salvar: jest.fn() };
  const service = ListarMetagame.criar(criarMockTorneioGateway(), criarMockInscricaoGateway(), criarMockPartidaGateway(), criarMockDeckGateway(), criarMockUsuarioGateway(), cache as unknown as CacheDynamoDbServico);
  const result = await service.executar({ formato: "pauper", dias: 30 });
  expect(result.arquetipos).toEqual([{ ...burn, matchups }, { ...terror, matchups: [] }]);
  expect(cache.buscar).toHaveBeenCalledWith("metagame", "lista#formato=pauper#dias=30#matchups=v1", 1);
  expect(cache.salvar).toHaveBeenCalledWith("metagame", "lista#formato=pauper#dias=30#matchups=v1", result, expect.any(Number), 1);
  cache.buscar.mockResolvedValue(result);
  expect(await service.executar({ formato: "pauper", dias: 30 })).toEqual(result);
  expect(carregarEAgregarMetagame).toHaveBeenCalledTimes(1);
  cache.buscar.mockResolvedValue(null);
  await service.executar({ formato: "pauper", dataInicio: "2025-01-01", dataFim: "2025-01-31" });
  expect(cache.buscar).toHaveBeenLastCalledWith("metagame", "lista#formato=pauper#dias=30#matchups=v1#de=2025-01-01#ate=2025-01-31", 1);
  expect(carregarEAgregarMetagame).toHaveBeenLastCalledWith(expect.any(Object), "pauper", 30, {
    dataInicio: new Date("2025-01-01T03:00:00.000Z"), dataFim: new Date("2025-02-01T02:59:59.999Z"),
  });
});
