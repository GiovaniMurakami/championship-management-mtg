import { PostGateway } from "../../dominio/gateway/postGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { CasoDeUso } from "../casoDeUso";
import { ImagemGateway } from "../../dominio/gateway/imagemGateway";

export class ExcluirPost implements CasoDeUso<{ postId: string }, { excluido: true }> {
  private constructor(private readonly posts: PostGateway, private readonly imagens: ImagemGateway) {}
  public static criar(posts: PostGateway, imagens: ImagemGateway): ExcluirPost { return new ExcluirPost(posts, imagens); }
  public async executar({ postId }: { postId: string }): Promise<{ excluido: true }> {
    const post = await this.posts.buscarPorId(postId);
    if (!post || !await this.posts.excluir(postId)) throw ErroPersonalizado.criar({ mensagem: "Post não encontrado.", status: StatusErro.erroNaoEncontrado });
    await Promise.all(post.imagens.map((url) => this.imagens.excluirPorUrl(url)));
    return { excluido: true };
  }
}
