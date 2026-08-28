import { BuscarPost } from "../../../src/casosDeUso/post/buscarPost";
import { ComentarPost } from "../../../src/casosDeUso/post/comentarPost";
import { CurtirPost } from "../../../src/casosDeUso/post/curtirPost";
import { EditarPost } from "../../../src/casosDeUso/post/editarPost";
import { ExcluirPost } from "../../../src/casosDeUso/post/excluirPost";
import { ListarPosts } from "../../../src/casosDeUso/post/listarPosts";
import { ComentarioPost, Post } from "../../../src/dominio/entidade/post";
import { PostGateway } from "../../../src/dominio/gateway/postGateway";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { criarMockImagemGateway, criarMockUsuarioGateway } from "../../mocks/gateways";

const post = (indice = 0, quantidadeImagens = 1) => new Post({
  id: `post-${indice}`, autorId: "user-1", legenda: `Post ${indice}`,
  imagens: Array.from({ length: quantidadeImagens }, (_, i) => `https://bucket/imagem-${indice}-${i}.jpg`),
  criadoEm: new Date(Date.UTC(2026, 7, 28, 12, 0, indice)),
});

function criarGateway(overrides: Partial<PostGateway> = {}): jest.Mocked<PostGateway> {
  return {
    salvar: jest.fn(), buscarPorId: jest.fn().mockResolvedValue(null), listar: jest.fn().mockResolvedValue([]),
    excluir: jest.fn().mockResolvedValue(false), salvarComentario: jest.fn(), listarComentarios: jest.fn().mockResolvedValue([]),
    excluirComentario: jest.fn().mockResolvedValue(false), curtir: jest.fn().mockResolvedValue(true),
    descurtir: jest.fn().mockResolvedValue(true), listarCurtidas: jest.fn().mockResolvedValue([]), ...overrides,
  } as jest.Mocked<PostGateway>;
}

const usuario = new Usuario({ id: "user-1", nome: "Giovani", email: "g@example.com", senha: "hash", fotoUrl: "https://bucket/avatar.jpg" });

describe("casos de uso de posts", () => {
  it("pagina em 20 itens, expõe o total e limita a prévia a 10 imagens", async () => {
    const posts = Array.from({ length: 25 }, (_, i) => post(i, 12));
    const gateway = criarGateway({ listar: jest.fn().mockResolvedValue(posts) });
    const useCase = ListarPosts.criar(gateway, criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario]) }));
    const resultado = await useCase.executar({ usuarioId: "user-1", limite: 20, offset: 0 }) as any;
    expect(resultado.posts).toHaveLength(20);
    expect(resultado.total).toBe(25);
    expect(resultado.posts[0].imagens).toHaveLength(10);
    expect(resultado.posts[0].totalImagens).toBe(12);
    expect(resultado.posts[0].autor.fotoUrl).toBe(usuario.fotoUrl);
  });

  it("busca o detalhe com todas as imagens, curtidas e comentários", async () => {
    const item = post(1, 12);
    const comentario = new ComentarioPost({ id: "comment-1", postId: item.id, autorId: usuario.id, texto: "Muito bom" });
    const gateway = criarGateway({ buscarPorId: jest.fn().mockResolvedValue(item), listarComentarios: jest.fn().mockResolvedValue([comentario]), listarCurtidas: jest.fn().mockResolvedValue([usuario.id]) });
    const resultado = await BuscarPost.criar(gateway, criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuario]) })).executar({ postId: item.id, usuarioId: usuario.id }) as any;
    expect(resultado.imagens).toHaveLength(12);
    expect(resultado.curtidoPorMim).toBe(true);
    expect(resultado.comentarios[0]).toMatchObject({ texto: "Muito bom", autor: { fotoUrl: usuario.fotoUrl } });
  });

  it("retorna 404 ao buscar post inexistente", async () => {
    await expect(BuscarPost.criar(criarGateway(), criarMockUsuarioGateway()).executar({ postId: "missing" })).rejects.toMatchObject({ status: 404 });
  });

  it("edita, elimina duplicadas e remove do S3 somente as imagens retiradas", async () => {
    const item = post(1, 3); const gateway = criarGateway({ buscarPorId: jest.fn().mockResolvedValue(item) });
    const imagens = criarMockImagemGateway();
    const finais = [item.imagens[0], item.imagens[2], item.imagens[2], "https://bucket/nova.jpg"];
    const resultado = await EditarPost.criar(gateway, imagens).executar({ postId: item.id, legenda: " nova ", imagens: finais }) as any;
    expect(resultado.imagens).toEqual([finais[0], finais[1], finais[3]]);
    expect(gateway.salvar).toHaveBeenCalledWith(item);
    expect(imagens.excluirPorUrl).toHaveBeenCalledTimes(1);
    expect(imagens.excluirPorUrl).toHaveBeenCalledWith("https://bucket/imagem-1-1.jpg");
  });

  it("exclui post e todas as imagens no S3", async () => {
    const item = post(2, 3); const gateway = criarGateway({ buscarPorId: jest.fn().mockResolvedValue(item), excluir: jest.fn().mockResolvedValue(true) });
    const imagens = criarMockImagemGateway();
    await expect(ExcluirPost.criar(gateway, imagens).executar({ postId: item.id })).resolves.toEqual({ excluido: true });
    expect(imagens.excluirPorUrl).toHaveBeenCalledTimes(3);
  });

  it("cria comentário apenas quando o post existe", async () => {
    const item = post(); const gateway = criarGateway({ buscarPorId: jest.fn().mockResolvedValue(item) });
    const comentario = await ComentarPost.criar(gateway).executar({ postId: item.id, autorId: usuario.id, texto: "  Legal  " });
    expect(comentario.texto).toBe("Legal");
    expect(gateway.salvarComentario).toHaveBeenCalledWith(comentario);
    await expect(ComentarPost.criar(criarGateway()).executar({ postId: "missing", autorId: usuario.id, texto: "x" })).rejects.toMatchObject({ status: 404 });
  });

  it("curte e descurte retornando o total atualizado", async () => {
    const item = post(); const gateway = criarGateway({ buscarPorId: jest.fn().mockResolvedValue(item), listarCurtidas: jest.fn().mockResolvedValue(["user-1", "user-2"]) });
    await expect(CurtirPost.criar(gateway).executar({ postId: item.id, usuarioId: usuario.id, curtir: true })).resolves.toEqual({ curtido: true, totalCurtidas: 2 });
    await CurtirPost.criar(gateway).executar({ postId: item.id, usuarioId: usuario.id, curtir: false });
    expect(gateway.curtir).toHaveBeenCalledWith(item.id, usuario.id);
    expect(gateway.descurtir).toHaveBeenCalledWith(item.id, usuario.id);
  });
});
