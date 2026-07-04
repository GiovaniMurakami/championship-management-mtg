import { PostBlog } from "../entidade/postBlog";

export type FiltrosListarPostsBlog = {
  limite?: number;
  offset?: number;
  apenasPublicados?: boolean;
};

export interface PostBlogGateway {
  salvar(post: PostBlog): Promise<void>;
  buscarPorId(id: string): Promise<PostBlog | null>;
  buscarPorSlug(slug: string): Promise<PostBlog | null>;
  buscarPorWordpressId(wordpressId: number): Promise<PostBlog | null>;
  listar(filtros?: FiltrosListarPostsBlog): Promise<PostBlog[]>;
  listarTotal(apenasPublicados?: boolean): Promise<number>;
  atualizar(post: PostBlog): Promise<void>;
  excluir(id: string): Promise<void>;
}
