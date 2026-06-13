import { BuscarAnuncios } from "../../../src/casosDeUso/site/buscarAnuncios";
import { SalvarAnuncios } from "../../../src/casosDeUso/site/salvarAnuncios";
import { AnunciosSiteConfig, SiteConfigGateway } from "../../../src/dominio/gateway/siteConfigGateway";

function criarGateway(overrides: Partial<SiteConfigGateway> = {}): SiteConfigGateway {
  return {
    buscarAnuncios: jest.fn().mockResolvedValue(null),
    salvarAnuncios: jest.fn(async (config: AnunciosSiteConfig) => config),
    ...overrides,
  };
}

describe("Anuncios do site", () => {
  it("deve retornar lista vazia quando nao ha configuracao salva", async () => {
    const uc = BuscarAnuncios.criar(criarGateway());

    const resultado = await uc.executar();

    expect(resultado).toEqual({ anuncios: [], atualizadoEm: null });
  });

  it("deve normalizar e salvar cards e banners", async () => {
    const gateway = criarGateway();
    const uc = SalvarAnuncios.criar(gateway);

    const resultado = await uc.executar({
      anuncios: [
        {
          tipo: "card",
          tag: " Patrocinador ",
          titulo: " Loja ",
          texto: " Texto ",
          imagemUrl: " https://cdn.example.com/logo.png ",
          link: " https://example.com ",
          botaoTexto: " Comprar ",
        },
        {
          tipo: "banner",
          titulo: "Banner",
          imagemUrl: "https://cdn.example.com/banner.png",
          ativo: false,
        },
      ],
    });

    expect(resultado.anuncios).toHaveLength(2);
    expect(resultado.anuncios[0]).toMatchObject({
      tipo: "card",
      tag: "Patrocinador",
      titulo: "Loja",
      texto: "Texto",
      link: "https://example.com",
      botaoTexto: "Comprar",
      ativo: true,
      ordem: 0,
    });
    expect(resultado.anuncios[1]).toMatchObject({
      tipo: "banner",
      titulo: "Banner",
      imagemUrl: "https://cdn.example.com/banner.png",
      ativo: false,
      ordem: 1,
    });
    expect(gateway.salvarAnuncios).toHaveBeenCalledTimes(1);
  });

  it("deve rejeitar banner sem imagem", async () => {
    const uc = SalvarAnuncios.criar(criarGateway());

    await expect(uc.executar({
      anuncios: [{ tipo: "banner", titulo: "Banner sem imagem" }],
    })).rejects.toMatchObject({ status: 400 });
  });
});
