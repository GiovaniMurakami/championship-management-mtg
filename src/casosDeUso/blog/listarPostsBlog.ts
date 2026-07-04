import { PostBlogGateway } from "../../dominio/gateway/postBlogGateway";
import { CasoDeUso } from "../casoDeUso";
import { normalizarPaginacaoOffset } from "../../helpers/paginacao";

const LIMITE_MAXIMO = 50;
const LIMITE_PADRAO = 12;

export type ListarPostsBlogInputDto = {
  limite?: number;
  offset?: number;
};

export type PostBlogResumoDto = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  imagemCapaUrl?: string;
  autorNome?: string;
  publicadoEm: Date;
};

export type ListarPostsBlogOutputDto = {
  posts: PostBlogResumoDto[];
  total: number;
  limite: number;
  offset: number;
};

function mapPostResumo(post: {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  imagemCapaUrl?: string;
  autorNome?: string;
  publicadoEm: Date;
}): PostBlogResumoDto {
  return {
    id: post.id,
    slug: post.slug,
    titulo: post.titulo,
    resumo: post.resumo,
    imagemCapaUrl: post.imagemCapaUrl,
    autorNome: post.autorNome,
    publicadoEm: post.publicadoEm,
  };
}

export class ListarPostsBlog implements CasoDeUso<ListarPostsBlogInputDto, ListarPostsBlogOutputDto> {
  private constructor(private readonly postBlogGateway: PostBlogGateway) {}

  public static criar(postBlogGateway: PostBlogGateway) {
    return new ListarPostsBlog(postBlogGateway);
  }

  public async executar(input: ListarPostsBlogInputDto): Promise<ListarPostsBlogOutputDto> {
    const { limite, offset } = normalizarPaginacaoOffset(
      input.limite,
      input.offset,
      LIMITE_PADRAO,
      LIMITE_MAXIMO
    );

    const [posts, total] = await Promise.all([
      this.postBlogGateway.listar({ limite, offset, apenasPublicados: true }),
      this.postBlogGateway.listarTotal(true),
    ]);

    return {
      posts: posts.map(mapPostResumo),
      total,
      limite,
      offset,
    };
  }
}

export class ListarPostsBlogAdmin implements CasoDeUso<ListarPostsBlogInputDto, ListarPostsBlogOutputDto & {
  posts: (PostBlogResumoDto & { publicado: boolean })[];
}> {
  private constructor(private readonly postBlogGateway: PostBlogGateway) {}

  public static criar(postBlogGateway: PostBlogGateway) {
    return new ListarPostsBlogAdmin(postBlogGateway);
  }

  public async executar(input: ListarPostsBlogInputDto) {
    const { limite, offset } = normalizarPaginacaoOffset(
      input.limite,
      input.offset,
      LIMITE_PADRAO,
      LIMITE_MAXIMO
    );

    const [posts, total] = await Promise.all([
      this.postBlogGateway.listar({ limite, offset, apenasPublicados: false }),
      this.postBlogGateway.listarTotal(false),
    ]);

    return {
      posts: posts.map((post) => ({
        ...mapPostResumo(post),
        publicado: post.publicado,
      })),
      total,
      limite,
      offset,
    };
  }
}
