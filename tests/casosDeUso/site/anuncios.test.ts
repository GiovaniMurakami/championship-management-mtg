import { BuscarAnuncios } from "../../../src/casosDeUso/site/buscarAnuncios";
import { RegistrarCliqueAnuncio } from "../../../src/casosDeUso/site/registrarCliqueAnuncio";
import { SalvarAnuncios } from "../../../src/casosDeUso/site/salvarAnuncios";
import { AnunciosSiteConfig, SiteConfigGateway } from "../../../src/dominio/gateway/siteConfigGateway";

function criarGateway(overrides: Partial<SiteConfigGateway> = {}): SiteConfigGateway {
  return {
    buscarAnuncios: jest.fn().mockResolvedValue(null),
    salvarAnuncios: jest.fn(async (config: AnunciosSiteConfig) => config),
    registrarCliqueAnuncio: jest.fn().mockResolvedValue(null),
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

  it("deve preservar cliques existentes ao salvar anuncios", async () => {
    const gateway = criarGateway({
      buscarAnuncios: jest.fn().mockResolvedValue({
        anuncios: [
          {
            id: "ad-1",
            tipo: "card",
            titulo: "Antigo",
            ativo: true,
            ordem: 0,
            cliques: 7,
          },
        ],
      }),
    });
    const uc = SalvarAnuncios.criar(gateway);

    const resultado = await uc.executar({
      anuncios: [
        {
          id: "ad-1",
          tipo: "card",
          titulo: "Atualizado",
        },
      ],
    });

    expect(resultado.anuncios[0]).toMatchObject({
      id: "ad-1",
      titulo: "Atualizado",
      cliques: 7,
    });
  });

  it("deve registrar clique de anuncio", async () => {
    const gateway = criarGateway({
      registrarCliqueAnuncio: jest.fn().mockResolvedValue({
        anuncios: [
          {
            id: "ad-1",
            tipo: "card",
            titulo: "Loja",
            ativo: true,
            ordem: 0,
            cliques: 8,
          },
        ],
      }),
    });
    const uc = RegistrarCliqueAnuncio.criar(gateway);

    const resultado = await uc.executar({ anuncioId: "ad-1" });

    expect(resultado).toEqual({ anuncioId: "ad-1", cliques: 8 });
    expect(gateway.registrarCliqueAnuncio).toHaveBeenCalledWith("ad-1");
  });

  it("deve rejeitar banner sem imagem", async () => {
    const uc = SalvarAnuncios.criar(criarGateway());

    await expect(uc.executar({
      anuncios: [{ tipo: "banner", titulo: "Banner sem imagem" }],
    })).rejects.toMatchObject({ status: 400 });
  });

  it("deve rejeitar clique de anuncio inexistente", async () => {
    const uc = RegistrarCliqueAnuncio.criar(criarGateway());

    await expect(uc.executar({ anuncioId: "ad-inexistente" })).rejects.toMatchObject({ status: 404 });
  });
});
