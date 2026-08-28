import { ComentarioPost, Post } from "../../../dominio/entidade/post";
import { PostGateway } from "../../../dominio/gateway/postGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type PostItem = { id: string; autorId: string; legenda: string; imagens: string[]; criadoEm: string };
type ComentarioItem = { id: string; postId: string; autorId: string; texto: string; criadoEm: string };
type CurtidaItem = { usuarioId: string };
const POSTS_PK = "POSTS";

export class PostDynamoRepositorio extends BaseDynamoRepositorio implements PostGateway {
  private constructor() { super(); }
  public static criar(): PostDynamoRepositorio { return new PostDynamoRepositorio(); }

  public async salvar(post: Post): Promise<void> {
    await this.putJson(POSTS_PK, `POST#${post.id}`, this.postParaItem(post), { entity: "POST" });
  }
  public async buscarPorId(id: string): Promise<Post | null> {
    const item = await this.getJson<PostItem>(POSTS_PK, `POST#${id}`);
    return item ? this.itemParaPost(item) : null;
  }
  public async listar(): Promise<Post[]> {
    const itens = await this.queryJson<PostItem>(POSTS_PK);
    return itens.filter((i) => Boolean(i.id && i.imagens)).map((i) => this.itemParaPost(i))
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  }
  public async excluir(id: string): Promise<boolean> {
    if (!await this.buscarPorId(id)) return false;
    const relacionados = await this.queryJson<ComentarioItem | CurtidaItem>(`POST#${id}`);
    const requests = relacionados.map((item) => this.toDeleteRequest(
      `POST#${id}`,
      "texto" in item ? `COMENTARIO#${(item as ComentarioItem).id}` : `CURTIDA#${(item as CurtidaItem).usuarioId}`
    ));
    await this.batchWrite(requests);
    await this.delete(POSTS_PK, `POST#${id}`);
    return true;
  }
  public async salvarComentario(comentario: ComentarioPost): Promise<void> {
    await this.putJson(`POST#${comentario.postId}`, `COMENTARIO#${comentario.id}`, {
      id: comentario.id, postId: comentario.postId, autorId: comentario.autorId,
      texto: comentario.texto, criadoEm: comentario.criadoEm.toISOString(),
    } satisfies ComentarioItem, { entity: "COMENTARIO_POST" });
  }
  public async listarComentarios(postId: string): Promise<ComentarioPost[]> {
    const itens = await this.queryJson<ComentarioItem | CurtidaItem>(`POST#${postId}`);
    return itens.filter((i): i is ComentarioItem => "texto" in i).map((i) => new ComentarioPost({
      ...i, criadoEm: new Date(i.criadoEm),
    })).sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
  }
  public async excluirComentario(postId: string, comentarioId: string): Promise<boolean> {
    const existente = await this.getJson<ComentarioItem>(`POST#${postId}`, `COMENTARIO#${comentarioId}`);
    if (!existente) return false;
    await this.delete(`POST#${postId}`, `COMENTARIO#${comentarioId}`);
    return true;
  }
  public async curtir(postId: string, usuarioId: string): Promise<boolean> {
    const pk = `POST#${postId}`; const sk = `CURTIDA#${usuarioId}`;
    if (await this.getJson<CurtidaItem>(pk, sk)) return false;
    await this.putJson(pk, sk, { usuarioId } satisfies CurtidaItem, { entity: "CURTIDA_POST" });
    return true;
  }
  public async descurtir(postId: string, usuarioId: string): Promise<boolean> {
    const pk = `POST#${postId}`; const sk = `CURTIDA#${usuarioId}`;
    if (!await this.getJson<CurtidaItem>(pk, sk)) return false;
    await this.delete(pk, sk); return true;
  }
  public async listarCurtidas(postId: string): Promise<string[]> {
    const itens = await this.queryJson<ComentarioItem | CurtidaItem>(`POST#${postId}`);
    return itens.filter((i): i is CurtidaItem => "usuarioId" in i && !("texto" in i)).map((i) => i.usuarioId);
  }
  private postParaItem(post: Post): PostItem {
    return { id: post.id, autorId: post.autorId, legenda: post.legenda, imagens: post.imagens, criadoEm: post.criadoEm.toISOString() };
  }
  private itemParaPost(item: PostItem): Post { return new Post({ ...item, criadoEm: new Date(item.criadoEm) }); }
}
