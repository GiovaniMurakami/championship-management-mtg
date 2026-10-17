import { BuscarParceiros } from "../../../src/casosDeUso/site/buscarParceiros";
import { BuscarSlidesHome } from "../../../src/casosDeUso/site/buscarSlidesHome";
import { SalvarParceiros } from "../../../src/casosDeUso/site/salvarParceiros";
import { SalvarSlidesHome } from "../../../src/casosDeUso/site/salvarSlidesHome";
import { SiteConfigGateway } from "../../../src/dominio/gateway/siteConfigGateway";
import { CACHE_PK_SITE } from "../../../src/helpers/cache/chavesCache";

const SLIDE_ID = "550e8400-e29b-41d4-a716-446655440001";
const PARCEIRO_ID = "550e8400-e29b-41d4-a716-446655440002";

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

describe("Slides e parceiros da home", () => {
  it("oculta slides inativos no retorno publico", async () => {
    const gateway = criarGateway({
      buscarSlidesHome: vi.fn().mockResolvedValue({
        slides: [
          {
            id: SLIDE_ID,
            imagemUrl: "https://cdn.example/a.webp",
            titulo: "Ativo",
            ordem: 0,
            ativo: true,
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440099",
            imagemUrl: "https://cdn.example/b.webp",
            titulo: "Inativo",
            ordem: 1,
            ativo: false,
          },
        ],
        atualizadoEm: new Date("2026-06-23T21:26:19.083Z"),
      }),
    });

    const resultado = await BuscarSlidesHome.criar(gateway).executar();

    expect(resultado.slides).toHaveLength(1);
    expect(resultado.slides[0].titulo).toBe("Ativo");
  });

  it("salva slides e invalida cache do site", async () => {
    const gateway = criarGateway();
    const cache = { invalidarParticao: vi.fn().mockResolvedValue(undefined) };
    const uc = SalvarSlidesHome.criar(gateway, cache as never);

    const saida = await uc.executar({
      slides: [
        {
          imagemUrl: "https://cdn.example/slide.webp",
          titulo: "Torneios",
          ctaTexto: "Ver",
          ctaUrl: "https://app.example/torneios",
          ativo: true,
        },
      ],
    });

    expect(saida.slides).toHaveLength(1);
    expect(saida.slides[0].titulo).toBe("Torneios");
    expect(gateway.salvarSlidesHome).toHaveBeenCalledOnce();
    expect(cache.invalidarParticao).toHaveBeenCalledWith(CACHE_PK_SITE);
  });

  it("exige nome ao salvar parceiro", async () => {
    const uc = SalvarParceiros.criar(criarGateway());

    await expect(
      uc.executar({
        parceiros: [{ logoUrl: "https://cdn.example/logo.webp", linkUrl: "https://loja.example" }],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("filtra parceiros sem logo no retorno publico", async () => {
    const gateway = criarGateway({
      buscarParceiros: vi.fn().mockResolvedValue({
        parceiros: [
          {
            id: PARCEIRO_ID,
            nome: "Loja",
            logoUrl: "https://cdn.example/logo.webp",
            linkUrl: "https://loja.example",
            ordem: 0,
            ativo: true,
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440098",
            nome: "Sem logo",
            logoUrl: "",
            linkUrl: "https://loja.example",
            ordem: 1,
            ativo: true,
          },
        ],
        cupomGlobal: "FUGUETE05",
        atualizadoEm: new Date("2026-06-23T21:26:19.083Z"),
      }),
    });

    const resultado = await BuscarParceiros.criar(gateway).executar();

    expect(resultado.parceiros).toHaveLength(1);
    expect(resultado.cupomGlobal).toBe("FUGUETE05");
  });

  it("salva e devolve textos da página /parceiros", async () => {
    const gateway = criarGateway();
    const cache = { invalidarParticao: vi.fn().mockResolvedValue(undefined) };
    const uc = SalvarParceiros.criar(gateway, cache as never);

    const saida = await uc.executar({
      parceiros: [
        {
          id: PARCEIRO_ID,
          nome: "Loja Top",
          logoUrl: "https://cdn.example/logo.webp",
          linkUrl: "https://loja.example",
          ativo: true,
        },
      ],
      cupomGlobal: "FUGUETE05",
      paginaTitulo: "Somos parceiros das principais lojas",
      paginaTexto: "Reconhecimento da comunidade.",
      ctaTitulo: "Ainda não é parceiro?",
      ctaTexto: "Fale conosco.",
      contatoEmail: "contato@tiagofuguete.com.br",
    });

    expect(saida.paginaTitulo).toBe("Somos parceiros das principais lojas");
    expect(saida.paginaTexto).toBe("Reconhecimento da comunidade.");
    expect(saida.ctaTitulo).toBe("Ainda não é parceiro?");
    expect(saida.ctaTexto).toBe("Fale conosco.");
    expect(saida.contatoEmail).toBe("contato@tiagofuguete.com.br");
    expect(saida.cupomGlobal).toBe("FUGUETE05");
    expect(gateway.salvarParceiros).toHaveBeenCalledWith(
      expect.objectContaining({
        paginaTitulo: "Somos parceiros das principais lojas",
        contatoEmail: "contato@tiagofuguete.com.br",
      }),
    );
    expect(cache.invalidarParticao).toHaveBeenCalledWith(CACHE_PK_SITE);
  });

  it("retorna textos da página no GET público", async () => {
    const gateway = criarGateway({
      buscarParceiros: vi.fn().mockResolvedValue({
        parceiros: [
          {
            id: PARCEIRO_ID,
            nome: "Loja",
            logoUrl: "https://cdn.example/logo.webp",
            linkUrl: "https://loja.example",
            ordem: 0,
            ativo: true,
          },
        ],
        cupomGlobal: "FUGUETE05",
        paginaTitulo: "Título cadastrado",
        paginaTexto: "Texto cadastrado",
        ctaTitulo: "CTA",
        ctaTexto: "Texto CTA",
        contatoEmail: "contato@tiagofuguete.com.br",
        atualizadoEm: new Date("2026-06-23T21:26:19.083Z"),
      }),
    });

    const resultado = await BuscarParceiros.criar(gateway).executar();

    expect(resultado.paginaTitulo).toBe("Título cadastrado");
    expect(resultado.paginaTexto).toBe("Texto cadastrado");
    expect(resultado.ctaTitulo).toBe("CTA");
    expect(resultado.ctaTexto).toBe("Texto CTA");
    expect(resultado.contatoEmail).toBe("contato@tiagofuguete.com.br");
  });
});
