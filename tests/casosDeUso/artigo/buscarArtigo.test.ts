import { Artigo } from "../../../src/dominio/entidade/artigo";
import { BuscarArtigo, buscarArtigoPorIdOuSlug } from "../../../src/casosDeUso/artigo/buscarArtigo";
import { BuscarSeoArtigo } from "../../../src/casosDeUso/artigo/buscarSeoArtigo";
import { ListarArtigos } from "../../../src/casosDeUso/artigo/listarArtigos";
import { montarHtmlCompartilhamentoArtigo } from "../../../src/infra/api/express/rotas/artigo/renderizarCompartilhamentoArtigo.express.route";

const artigo = new Artigo({
  id: "abc12def-0000-4000-8000-000000000001",
  autorId: "autor-1",
  titulo: "Pauper de sexta",
  chamada: "Uma chamada",
  descricao: "Descricao longa",
  tags: [],
  capaUrl: "https://cdn.example.com/capa.jpg",
  conteudoS3Key: "artigo/conteudo",
  conteudoPublicadoS3Key: "artigo/publicado",
  status: "publicado",
});

function gateway(extra: Record<string, unknown> = {}) {
  return {
    buscarPorId: vi.fn(async (id: string) => (id === artigo.id ? artigo : null)),
    buscarPorPrefixo: vi.fn(async (prefixo: string) => (prefixo === "abc12" ? artigo : null)),
    listar: vi.fn(async () => [artigo]),
    listarComentarios: vi.fn(async () => []),
    listarCurtidas: vi.fn(async () => []),
    listarCurtidasComentarios: vi.fn(async () => []),
    incrementarVisualizacoes: vi.fn(async () => 3),
    ...extra,
  } as any;
}

describe("artigo por slug e compartilhamento", () => {
  it("resolve o artigo pelos 5 primeiros caracteres do id", async () => {
    const repo = gateway();
    const encontrado = await buscarArtigoPorIdOuSlug(repo, "abc12-pauper-de-sexta");
    expect(encontrado?.id).toBe(artigo.id);
    expect(repo.buscarPorPrefixo).toHaveBeenCalledWith("abc12");
  });

  it("inclui a capa no HTML de compartilhamento", () => {
    const html = montarHtmlCompartilhamentoArtigo({
      artigoId: artigo.id,
      title: artigo.titulo,
      description: artigo.chamada,
      image: artigo.capaUrl!,
      imageType: "image/jpeg",
    }, undefined, "https://app.tiagofuguete.com.br");
    expect(html).toContain('property="og:image" content="https://cdn.example.com/capa.jpg"');
    expect(html).toContain("/artigos/abc12-pauper-de-sexta");
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it("busca o artigo publicado pelo slug", async () => {
    const caso = BuscarArtigo.criar(gateway(), { ler: vi.fn(async () => "texto") } as any, {
      buscarPorId: vi.fn(async () => null),
      buscarVarios: vi.fn(async () => []),
    } as any);
    const saida = await caso.executar({ id: "abc12-pauper-de-sexta" });
    expect(saida.id).toBe(artigo.id);
    expect(saida.capaUrl).toBe(artigo.capaUrl);
  });

  it("expoe a capa no SEO e a quantidade de comentarios na listagem", async () => {
    const repo = gateway({
      listarComentarios: vi.fn(async () => [{ id: "c1" }, { id: "c2" }]),
    });
    const seo = await BuscarSeoArtigo.criar(repo).executar({ artigoId: "abc12-pauper-de-sexta" });
    expect(seo.image).toBe("https://cdn.example.com/capa.jpg");

    const lista = await ListarArtigos.criar(repo, {
      buscarVarios: vi.fn(async () => []),
    } as any).executar({});
    expect(lista.artigos[0].totalComentarios).toBe(2);
  });
});
