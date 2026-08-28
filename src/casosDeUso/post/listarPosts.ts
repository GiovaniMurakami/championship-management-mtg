import { PostGateway } from "../../dominio/gateway/postGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";

export class ListarPosts implements CasoDeUso<{ usuarioId?: string; limite?: number; offset?: number }, unknown> {
  private constructor(private readonly posts: PostGateway, private readonly usuarios: UsuarioGateway) {}
  public static criar(posts: PostGateway, usuarios: UsuarioGateway): ListarPosts { return new ListarPosts(posts, usuarios); }
  public async executar({ usuarioId, limite = 20, offset = 0 }: { usuarioId?: string; limite?: number; offset?: number }) {
    const todos = await this.posts.listar();
    const posts = todos.slice(offset, offset + limite);
    const detalhes = await Promise.all(posts.map(async (post) => {
      const [comentarios, curtidas] = await Promise.all([
        this.posts.listarComentarios(post.id), this.posts.listarCurtidas(post.id),
      ]);
      const ids = [...new Set([post.autorId, ...comentarios.map((c) => c.autorId)])];
      const usuarios = await this.usuarios.buscarVarios(ids);
      const porId = new Map(usuarios.map((u) => [u.id, u]));
      const autor = porId.get(post.autorId);
      return {
        id: post.id, legenda: post.legenda, imagens: post.imagens.slice(0, 10), totalImagens: post.imagens.length, criadoEm: post.criadoEm,
        autor: { id: post.autorId, nome: autor?.excluido ? "Usuário excluído" : autor?.nome ?? "Usuário", fotoUrl: autor?.fotoUrl },
        totalCurtidas: curtidas.length, curtidoPorMim: usuarioId ? curtidas.includes(usuarioId) : false,
        comentarios: comentarios.map((c) => { const u = porId.get(c.autorId); return {
          id: c.id, texto: c.texto, criadoEm: c.criadoEm,
          autor: { id: c.autorId, nome: u?.excluido ? "Usuário excluído" : u?.nome ?? "Usuário", fotoUrl: u?.fotoUrl },
        }; }),
      };
    }));
    return { posts: detalhes, total: todos.length, limite, offset };
  }
}
