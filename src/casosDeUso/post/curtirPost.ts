import { PostGateway } from "../../dominio/gateway/postGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { CasoDeUso } from "../casoDeUso";

export class CurtirPost implements CasoDeUso<{ postId: string; usuarioId: string; curtir: boolean }, { curtido: boolean; totalCurtidas: number }> {
  private constructor(private readonly posts: PostGateway) {}
  public static criar(posts: PostGateway): CurtirPost { return new CurtirPost(posts); }
  public async executar(input: { postId: string; usuarioId: string; curtir: boolean }) {
    if (!await this.posts.buscarPorId(input.postId)) throw ErroPersonalizado.criar({ mensagem: "Post não encontrado.", status: StatusErro.erroNaoEncontrado });
    if (input.curtir) await this.posts.curtir(input.postId, input.usuarioId);
    else await this.posts.descurtir(input.postId, input.usuarioId);
    return { curtido: input.curtir, totalCurtidas: (await this.posts.listarCurtidas(input.postId)).length };
  }
}
