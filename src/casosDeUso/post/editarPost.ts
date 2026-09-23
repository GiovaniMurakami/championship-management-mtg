import { ImagemGateway } from "../../dominio/gateway/imagemGateway";
import { PostGateway } from "../../dominio/gateway/postGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { CasoDeUso } from "../casoDeUso";

export class EditarPost implements CasoDeUso<{ postId: string; legenda: string; imagens: string[] }, unknown> {
  private constructor(private readonly posts: PostGateway, private readonly imagens: ImagemGateway) {}
  public static criar(posts: PostGateway, imagens: ImagemGateway) { return new EditarPost(posts, imagens); }
  public async executar(input: { postId: string; legenda: string; imagens: string[] }) {
    const post = await this.posts.buscarPorId(input.postId);
    if (!post) throw ErroPersonalizado.criar({ mensagem: "Post não encontrado.", status: StatusErro.erroNaoEncontrado });
    const finais = [...new Set(input.imagens)];
    const removidas = post.imagens.filter((url) => !finais.includes(url));
    post.legenda = input.legenda.trim(); post.imagens = finais;
    await this.posts.salvar(post);
    await Promise.all(removidas.map((url) => this.imagens.excluirPorUrl(url)));
    return { id: post.id, legenda: post.legenda, imagens: post.imagens, totalImagens: post.imagens.length, criadoEm: post.criadoEm };
  }
}
