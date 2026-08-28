import { PostGateway } from "../../dominio/gateway/postGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { CasoDeUso } from "../casoDeUso";

export class BuscarPost implements CasoDeUso<{ postId: string; usuarioId?: string }, unknown> {
  private constructor(private readonly posts: PostGateway, private readonly usuarios: UsuarioGateway) {}
  public static criar(posts: PostGateway, usuarios: UsuarioGateway) { return new BuscarPost(posts, usuarios); }
  public async executar({ postId, usuarioId }: { postId: string; usuarioId?: string }) {
    const post = await this.posts.buscarPorId(postId);
    if (!post) throw ErroPersonalizado.criar({ mensagem: "Post não encontrado.", status: StatusErro.erroNaoEncontrado });
    const [comentarios, curtidas] = await Promise.all([this.posts.listarComentarios(post.id), this.posts.listarCurtidas(post.id)]);
    const ids = [...new Set([post.autorId, ...comentarios.map((c) => c.autorId)])];
    const usuarios = new Map((await this.usuarios.buscarVarios(ids)).map((u) => [u.id, u]));
    const autor = usuarios.get(post.autorId);
    return {
      id: post.id, legenda: post.legenda, imagens: post.imagens, totalImagens: post.imagens.length, criadoEm: post.criadoEm,
      autor: { id: post.autorId, nome: autor?.excluido ? "Usuário excluído" : autor?.nome ?? "Usuário", fotoUrl: autor?.fotoUrl },
      totalCurtidas: curtidas.length, curtidoPorMim: usuarioId ? curtidas.includes(usuarioId) : false,
      comentarios: comentarios.map((c) => { const usuario = usuarios.get(c.autorId); return {
        id: c.id, texto: c.texto, criadoEm: c.criadoEm,
        autor: { id: c.autorId, nome: usuario?.excluido ? "Usuário excluído" : usuario?.nome ?? "Usuário", fotoUrl: usuario?.fotoUrl },
      }; }),
    };
  }
}
