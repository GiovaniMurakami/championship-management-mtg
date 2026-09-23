import { SalvarCartaRepresentativaArquetipo } from "../../../src/casosDeUso/metagame/salvarCartaRepresentativaArquetipo";
import { MetagameOverridesConfig, SiteConfigGateway } from "../../../src/dominio/gateway/siteConfigGateway";
import { CACHE_PK_METAGAME } from "../../../src/helpers/cache/chavesCache";

function criarGateway(
  inicial: MetagameOverridesConfig | null = null,
  overrides: Partial<SiteConfigGateway> = {}
): SiteConfigGateway {
  let atual = inicial;
  return {
    buscarAnuncios: vi.fn().mockResolvedValue(null),
    salvarAnuncios: vi.fn(async (config) => config),
    registrarCliqueAnuncio: vi.fn().mockResolvedValue(null),
    buscarAnuncioDiario: vi.fn().mockResolvedValue(null),
    salvarAnuncioDiario: vi.fn(async (config) => config),
    registrarVisualizacaoAnuncioDiario: vi.fn().mockResolvedValue(null),
    registrarCliqueAnuncioDiario: vi.fn().mockResolvedValue(null),
    buscarMetagameOverrides: vi.fn(async () => atual),
    salvarMetagameOverrides: vi.fn(async (config: MetagameOverridesConfig) => {
      atual = config;
      return config;
    }),
    ...overrides,
  };
}

describe("SalvarCartaRepresentativaArquetipo", () => {
  it("salva override por formato#slug e invalida cache do metagame", async () => {
    const gateway = criarGateway();
    const cache = { invalidarParticao: vi.fn().mockResolvedValue(undefined) };
    const uc = SalvarCartaRepresentativaArquetipo.criar(gateway, cache as never);

    const saida = await uc.executar({
      formato: "Pauper",
      slug: "blue-terror",
      cartaRepresentativa: " Thought Scour ",
    });

    expect(saida).toEqual({
      formato: "pauper",
      slug: "blue-terror",
      cartaRepresentativa: "Thought Scour",
    });
    expect(gateway.salvarMetagameOverrides).toHaveBeenCalledWith({
      cartasRepresentativas: { "pauper#blue-terror": "Thought Scour" },
      atualizadoEm: expect.any(Date),
    });
    expect(cache.invalidarParticao).toHaveBeenCalledWith(CACHE_PK_METAGAME);
  });

  it("remove override quando cartaRepresentativa é vazia", async () => {
    const gateway = criarGateway({
      cartasRepresentativas: {
        "pauper#blue-terror": "Thought Scour",
        "pauper#affinity": "Cranial Plating",
      },
    });
    const uc = SalvarCartaRepresentativaArquetipo.criar(gateway);

    const saida = await uc.executar({
      formato: "pauper",
      slug: "blue-terror",
      cartaRepresentativa: "",
    });

    expect(saida.cartaRepresentativa).toBeNull();
    expect(gateway.salvarMetagameOverrides).toHaveBeenCalledWith({
      cartasRepresentativas: { "pauper#affinity": "Cranial Plating" },
      atualizadoEm: expect.any(Date),
    });
  });
});
