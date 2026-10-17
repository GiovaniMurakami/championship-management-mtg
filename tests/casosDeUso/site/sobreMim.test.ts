import { BuscarSobreMim, SOBRE_MIM_PADRAO } from "../../../src/casosDeUso/site/buscarSobreMim";
import { SalvarSobreMim } from "../../../src/casosDeUso/site/salvarSobreMim";
import { SiteConfigGateway } from "../../../src/dominio/gateway/siteConfigGateway";
import { CACHE_PK_SITE } from "../../../src/helpers/cache/chavesCache";

function criarGateway(overrides: Partial<SiteConfigGateway> = {}): SiteConfigGateway {
  return {
    buscarAnuncios: vi.fn().mockResolvedValue(null),
    salvarAnuncios: vi.fn(async (config) => config),
    registrarCliqueAnuncio: vi.fn().mockResolvedValue(null),
    buscarAnuncioDiario: vi.fn().mockResolvedValue(null),
    salvarAnuncioDiario: vi.fn(async (config) => config),
    registrarVisualizacaoAnuncioDiario: vi.fn().mockResolvedValue(null),
    registrarCliqueAnuncioDiario: vi.fn().mockResolvedValue(null),
    buscarMetagameOverrides: vi.fn().mockResolvedValue(null),
    salvarMetagameOverrides: vi.fn(async (config) => config),
    buscarSlidesHome: vi.fn().mockResolvedValue(null),
    salvarSlidesHome: vi.fn(async (config) => config),
    buscarParceiros: vi.fn().mockResolvedValue(null),
    salvarParceiros: vi.fn(async (config) => config),
    buscarConteudoHome: vi.fn().mockResolvedValue(null),
    salvarConteudoHome: vi.fn(async (config) => config),
    buscarSobreMim: vi.fn().mockResolvedValue(null),
    salvarSobreMim: vi.fn(async (config) => config),
    ...overrides,
  };
}

describe("Sobre mim", () => {
  it("usa conteúdo padrão quando não há config salva", async () => {
    const resultado = await BuscarSobreMim.criar(criarGateway()).executar();

    expect(resultado.tituloHistoria).toBe(SOBRE_MIM_PADRAO.tituloHistoria);
    expect(resultado.historia).toContain("Tiago Fuguete");
    expect(resultado.galeriaUrls).toEqual(SOBRE_MIM_PADRAO.galeriaUrls);
  });

  it("retorna conteúdo persistido quando existe", async () => {
    const gateway = criarGateway({
      buscarSobreMim: vi.fn().mockResolvedValue({
        tituloHistoria: "História custom",
        historia: "Texto custom",
        fotoUrl: "https://cdn.example/foto.webp",
        apoiaTitulo: "Apoie",
        apoiaTexto: "Texto apoia",
        apoiaImagemUrl: "https://cdn.example/apoia.webp",
        apoiaUrl: "https://apoia.se/x",
        galeriaTitulo: "Galeria",
        galeriaUrls: ["https://cdn.example/1.webp"],
        agradecimentoTitulo: "Obrigado",
        agradecimentoTexto: "Valeu",
        apoiadores: "A; B",
        atualizadoEm: new Date("2026-10-01T12:00:00.000Z"),
      }),
    });

    const resultado = await BuscarSobreMim.criar(gateway).executar();

    expect(resultado.tituloHistoria).toBe("História custom");
    expect(resultado.historia).toBe("Texto custom");
    expect(resultado.galeriaUrls).toEqual(["https://cdn.example/1.webp"]);
    expect(resultado.atualizadoEm).toBeTruthy();
  });

  it("salva conteúdo e invalida cache", async () => {
    const gateway = criarGateway();
    const cache = { invalidarParticao: vi.fn().mockResolvedValue(undefined) };

    const saida = await SalvarSobreMim.criar(gateway, cache as never).executar({
      tituloHistoria: "Novo título",
      historia: "Nova história",
      fotoUrl: "https://cdn.example/foto.webp",
      galeriaUrls: ["https://cdn.example/a.webp", "https://cdn.example/b.webp"],
    });

    expect(saida.tituloHistoria).toBe("Novo título");
    expect(saida.historia).toBe("Nova história");
    expect(saida.galeriaUrls).toHaveLength(2);
    expect(gateway.salvarSobreMim).toHaveBeenCalledOnce();
    expect(cache.invalidarParticao).toHaveBeenCalledWith(CACHE_PK_SITE);
  });
});
