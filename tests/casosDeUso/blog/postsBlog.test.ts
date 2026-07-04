import { PostBlog } from "../../../src/dominio/entidade/postBlog";
import { PostBlogGateway } from "../../../src/dominio/gateway/postBlogGateway";
import { CriarPostBlog } from "../../../src/casosDeUso/blog/criarPostBlog";
import { ListarPostsBlog } from "../../../src/casosDeUso/blog/listarPostsBlog";
import { BuscarPostBlog } from "../../../src/casosDeUso/blog/buscarPostBlog";

function criarGateway(initial: PostBlog[] = []): PostBlogGateway {
  const posts = [...initial];

  return {
    salvar: jest.fn(async (post: PostBlog) => {
      posts.push(post);
    }),
    buscarPorId: jest.fn(async (id: string) => posts.find((post) => post.id === id) ?? null),
    buscarPorSlug: jest.fn(async (slug: string) => posts.find((post) => post.slug === slug) ?? null),
    buscarPorWordpressId: jest.fn(async (wordpressId: number) =>
      posts.find((post) => post.wordpressId === wordpressId) ?? null
    ),
    listar: jest.fn(async (filtros = {}) => {
      const filtrados = filtros.apenasPublicados
        ? posts.filter((post) => post.publicado)
        : posts;
      const offset = filtros.offset ?? 0;
      const limite = filtros.limite ?? filtrados.length;
      return filtrados.slice(offset, offset + limite);
    }),
    listarTotal: jest.fn(async (apenasPublicados = false) =>
      (apenasPublicados ? posts.filter((post) => post.publicado) : posts).length
    ),
    atualizar: jest.fn(async (post: PostBlog) => {
      const index = posts.findIndex((item) => item.id === post.id);
      if (index >= 0) posts[index] = post;
    }),
    excluir: jest.fn(async (id: string) => {
      const index = posts.findIndex((post) => post.id === id);
      if (index >= 0) posts.splice(index, 1);
    }),
  };
}

describe("Posts do blog", () => {
  it("cria post com slug gerado a partir do titulo", async () => {
    const gateway = criarGateway();
    const uc = CriarPostBlog.criar(gateway);

    const resultado = await uc.executar({
      titulo: "Guia de Side Rakdos",
      resumo: "Depois do 5-0 em liga achei legal trazer um guia para vocês!",
      conteudo: "<p>Conteudo completo do artigo sobre Rakdos Madness.</p>",
      autorId: "admin-1",
      autorNome: "Tiago Fuguete",
    });

    expect(resultado.slug).toBe("guia-de-side-rakdos");
    expect(gateway.salvar).toHaveBeenCalledTimes(1);
  });

  it("lista apenas posts publicados", async () => {
    const gateway = criarGateway([
      PostBlog.criar({
        slug: "publicado",
        titulo: "Publicado",
        resumo: "Resumo publicado para teste de listagem.",
        conteudo: "<p>Conteudo publicado.</p>",
        publicado: true,
      }),
      PostBlog.criar({
        slug: "rascunho",
        titulo: "Rascunho",
        resumo: "Resumo rascunho para teste de listagem.",
        conteudo: "<p>Conteudo rascunho.</p>",
        publicado: false,
      }),
    ]);
    const uc = ListarPostsBlog.criar(gateway);

    const resultado = await uc.executar({});

    expect(resultado.total).toBe(1);
    expect(resultado.posts[0].slug).toBe("publicado");
  });

  it("nao expoe rascunho na busca publica", async () => {
    const gateway = criarGateway([
      PostBlog.criar({
        slug: "rascunho",
        titulo: "Rascunho",
        resumo: "Resumo rascunho para teste de busca.",
        conteudo: "<p>Conteudo rascunho.</p>",
        publicado: false,
      }),
    ]);
    const uc = BuscarPostBlog.criar(gateway);

    await expect(uc.executar({ slug: "rascunho" })).rejects.toMatchObject({
      message: "Post não encontrado.",
    });
  });
});
