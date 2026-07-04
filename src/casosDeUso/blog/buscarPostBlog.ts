import { PostBlogGateway } from "../../dominio/gateway/postBlogGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type BuscarPostBlogInputDto = {
  slug: string;
  incluirRascunho?: boolean;
};

export type BuscarPostBlogOutputDto = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  imagemCapaUrl?: string;
  autorNome?: string;
  publicado: boolean;
  publicadoEm: Date;
  atualizadoEm: Date;
};

export class BuscarPostBlog implements CasoDeUso<BuscarPostBlogInputDto, BuscarPostBlogOutputDto> {
  private constructor(private readonly postBlogGateway: PostBlogGateway) {}

  public static criar(postBlogGateway: PostBlogGateway) {
    return new BuscarPostBlog(postBlogGateway);
  }

  public async executar(input: BuscarPostBlogInputDto): Promise<BuscarPostBlogOutputDto> {
    const post = await this.postBlogGateway.buscarPorSlug(input.slug.trim().toLowerCase());
    if (!post) {
      throw ErroPersonalizado.criar({
        mensagem: "Post não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (!post.publicado && !input.incluirRascunho) {
      throw ErroPersonalizado.criar({
        mensagem: "Post não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    return {
      id: post.id,
      slug: post.slug,
      titulo: post.titulo,
      resumo: post.resumo,
      conteudo: post.conteudo,
      imagemCapaUrl: post.imagemCapaUrl,
      autorNome: post.autorNome,
      publicado: post.publicado,
      publicadoEm: post.publicadoEm,
      atualizadoEm: post.atualizadoEm,
    };
  }
}

export class BuscarPostBlogAdmin implements CasoDeUso<{ id: string }, BuscarPostBlogOutputDto> {
  private constructor(private readonly postBlogGateway: PostBlogGateway) {}

  public static criar(postBlogGateway: PostBlogGateway) {
    return new BuscarPostBlogAdmin(postBlogGateway);
  }

  public async executar(input: { id: string }): Promise<BuscarPostBlogOutputDto> {
    const post = await this.postBlogGateway.buscarPorId(input.id);
    if (!post) {
      throw ErroPersonalizado.criar({
        mensagem: "Post não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    return {
      id: post.id,
      slug: post.slug,
      titulo: post.titulo,
      resumo: post.resumo,
      conteudo: post.conteudo,
      imagemCapaUrl: post.imagemCapaUrl,
      autorNome: post.autorNome,
      publicado: post.publicado,
      publicadoEm: post.publicadoEm,
      atualizadoEm: post.atualizadoEm,
    };
  }
}
