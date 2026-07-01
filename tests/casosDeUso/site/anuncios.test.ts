import { BuscarAnuncios } from "../../../src/casosDeUso/site/buscarAnuncios";
import { RegistrarCliqueAnuncio } from "../../../src/casosDeUso/site/registrarCliqueAnuncio";
import { SalvarAnuncios } from "../../../src/casosDeUso/site/salvarAnuncios";
import { AnunciosSiteConfig, SiteConfigGateway } from "../../../src/dominio/gateway/siteConfigGateway";

const AD_ID = "550e8400-e29b-41d4-a716-446655440000";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    expect(resultado.anuncios[0].id).toMatch(UUID_REGEX);
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
    expect(resultado.anuncios[1].id).toMatch(UUID_REGEX);
    expect(resultado.anuncios[1]).toMatchObject({
      tipo: "banner",
      titulo: "Banner",
      imagemUrl: "https://cdn.example.com/banner.png",
      ativo: false,
      ordem: 1,
    });
    expect(gateway.salvarAnuncios).toHaveBeenCalledTimes(1);
  });

  it("deve preservar cliques existentes ao salvar anuncios com uuid valido", async () => {
    const gateway = criarGateway({
      buscarAnuncios: jest.fn().mockResolvedValue({
        anuncios: [
          {
            id: AD_ID,
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
          id: AD_ID,
          tipo: "card",
          titulo: "Atualizado",
        },
      ],
    });

    expect(resultado.anuncios[0]).toMatchObject({
      id: AD_ID,
      titulo: "Atualizado",
      cliques: 7,
    });
  });

  it("deve substituir id invalido por uuid ao salvar e preservar cliques", async () => {
    const gateway = criarGateway({
      buscarAnuncios: jest.fn().mockResolvedValue({
        anuncios: [
          {
            id: "anuncio-1781395148943-3",
            tipo: "card",
            titulo: "Antigo",
            ativo: true,
            ordem: 0,
            cliques: 4,
          },
        ],
      }),
    });
    const uc = SalvarAnuncios.criar(gateway);

    const resultado = await uc.executar({
      anuncios: [
        {
          id: "anuncio-1781395148943-3",
          tipo: "card",
          titulo: "Atualizado",
        },
      ],
    });

    expect(resultado.anuncios[0].id).toMatch(UUID_REGEX);
    expect(resultado.anuncios[0].id).not.toBe("anuncio-1781395148943-3");
    expect(resultado.anuncios[0]).toMatchObject({
      titulo: "Atualizado",
      cliques: 4,
    });
  });

  it("deve registrar clique de anuncio", async () => {
    const gateway = criarGateway({
      registrarCliqueAnuncio: jest.fn().mockResolvedValue({
        anuncios: [
          {
            id: AD_ID,
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

    const resultado = await uc.executar({ anuncioId: AD_ID });

    expect(resultado).toEqual({ anuncioId: AD_ID, cliques: 8 });
    expect(gateway.registrarCliqueAnuncio).toHaveBeenCalledWith(AD_ID);
  });

  it("deve rejeitar banner sem imagem", async () => {
    const uc = SalvarAnuncios.criar(criarGateway());

    await expect(uc.executar({
      anuncios: [{ tipo: "banner", titulo: "Banner sem imagem" }],
    })).rejects.toMatchObject({ status: 400 });
  });

  it("deve rejeitar clique de anuncio inexistente", async () => {
    const uc = RegistrarCliqueAnuncio.criar(criarGateway());

    await expect(uc.executar({ anuncioId: AD_ID })).rejects.toMatchObject({ status: 404 });
  });
});
