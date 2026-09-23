import { ComentarioPost, Post } from "../entidade/post";

export interface PostGateway {
  salvar(post: Post): Promise<void>;
  buscarPorId(id: string): Promise<Post | null>;
  listar(): Promise<Post[]>;
  excluir(id: string): Promise<boolean>;
  salvarComentario(comentario: ComentarioPost): Promise<void>;
  listarComentarios(postId: string): Promise<ComentarioPost[]>;
  excluirComentario(postId: string, comentarioId: string): Promise<boolean>;
  curtir(postId: string, usuarioId: string): Promise<boolean>;
  descurtir(postId: string, usuarioId: string): Promise<boolean>;
  listarCurtidas(postId: string): Promise<string[]>;
}
