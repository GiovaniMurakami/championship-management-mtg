import { Post } from "../../dominio/entidade/post";
import { PostGateway } from "../../dominio/gateway/postGateway";
import { CasoDeUso } from "../casoDeUso";

export type CriarPostInputDto = { autorId: string; legenda?: string; imagens: string[] };

export class CriarPost implements CasoDeUso<CriarPostInputDto, Post> {
  private constructor(private readonly posts: PostGateway) {}
  public static criar(posts: PostGateway): CriarPost { return new CriarPost(posts); }
  public async executar(input: CriarPostInputDto): Promise<Post> {
    const post = Post.criar({ autorId: input.autorId, legenda: input.legenda?.trim() ?? "", imagens: input.imagens });
    await this.posts.salvar(post);
    return post;
  }
}
