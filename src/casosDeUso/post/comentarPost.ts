import { ComentarioPost } from "../../dominio/entidade/post";
import { PostGateway } from "../../dominio/gateway/postGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { CasoDeUso } from "../casoDeUso";

export class ComentarPost implements CasoDeUso<{ postId: string; autorId: string; texto: string }, ComentarioPost> {
  private constructor(private readonly posts: PostGateway) {}
  public static criar(posts: PostGateway): ComentarPost { return new ComentarPost(posts); }
  public async executar(input: { postId: string; autorId: string; texto: string }): Promise<ComentarioPost> {
    if (!await this.posts.buscarPorId(input.postId)) throw ErroPersonalizado.criar({ mensagem: "Post não encontrado.", status: StatusErro.erroNaoEncontrado });
    const comentario = ComentarioPost.criar({ postId: input.postId, autorId: input.autorId, texto: input.texto.trim() });
    await this.posts.salvarComentario(comentario); return comentario;
  }
}
