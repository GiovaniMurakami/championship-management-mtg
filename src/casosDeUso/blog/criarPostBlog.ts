import { PostBlog } from "../../dominio/entidade/postBlog";
import { PostBlogGateway } from "../../dominio/gateway/postBlogGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { gerarSlug } from "../../helpers/texto/gerarSlug";
import { normalizarConteudoBlog } from "../../helpers/texto/normalizarConteudoBlog";

export type CriarPostBlogInputDto = {
  titulo: string;
  resumo: string;
  conteudo: string;
  imagemCapaUrl?: string;
  slug?: string;
  publicado?: boolean;
  autorId: string;
  autorNome?: string;
  publicadoEm?: Date;
};

export type PostBlogOutputDto = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  imagemCapaUrl?: string;
  autorNome?: string;
  publicado: boolean;
  publicadoEm: Date;
  criadoEm: Date;
  atualizadoEm: Date;
};

function mapPost(post: PostBlog): PostBlogOutputDto {
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
    criadoEm: post.criadoEm,
    atualizadoEm: post.atualizadoEm,
  };
}

async function garantirSlugUnico(
  gateway: PostBlogGateway,
  slugBase: string,
  ignorarId?: string
): Promise<string> {
  let slug = slugBase;
  let sufixo = 2;

  while (true) {
    const existente = await gateway.buscarPorSlug(slug);
    if (!existente || existente.id === ignorarId) return slug;
    slug = `${slugBase}-${sufixo}`;
    sufixo += 1;
  }
}

export class CriarPostBlog implements CasoDeUso<CriarPostBlogInputDto, PostBlogOutputDto> {
  private constructor(private readonly postBlogGateway: PostBlogGateway) {}

  public static criar(postBlogGateway: PostBlogGateway) {
    return new CriarPostBlog(postBlogGateway);
  }

  public async executar(input: CriarPostBlogInputDto): Promise<PostBlogOutputDto> {
    const slugBase = gerarSlug(input.slug?.trim() || input.titulo);
    if (!slugBase) {
      throw ErroPersonalizado.criar({
        mensagem: "Informe um título válido para gerar o slug do post.",
        status: StatusErro.erroParametro,
      });
    }

    const slug = await garantirSlugUnico(this.postBlogGateway, slugBase);
    const post = PostBlog.criar({
      slug,
      titulo: input.titulo.trim(),
      resumo: input.resumo.trim(),
      conteudo: normalizarConteudoBlog(input.conteudo),
      imagemCapaUrl: input.imagemCapaUrl?.trim() || undefined,
      publicado: input.publicado ?? true,
      autorId: input.autorId,
      autorNome: input.autorNome?.trim() || undefined,
      publicadoEm: input.publicadoEm ?? new Date(),
    });

    await this.postBlogGateway.salvar(post);
    return mapPost(post);
  }
}

export type AlterarPostBlogInputDto = {
  id: string;
  titulo?: string;
  resumo?: string;
  conteudo?: string;
  imagemCapaUrl?: string;
  slug?: string;
  publicado?: boolean;
  publicadoEm?: Date;
};

export class AlterarPostBlog implements CasoDeUso<AlterarPostBlogInputDto, PostBlogOutputDto> {
  private constructor(private readonly postBlogGateway: PostBlogGateway) {}

  public static criar(postBlogGateway: PostBlogGateway) {
    return new AlterarPostBlog(postBlogGateway);
  }

  public async executar(input: AlterarPostBlogInputDto): Promise<PostBlogOutputDto> {
    const post = await this.postBlogGateway.buscarPorId(input.id);
    if (!post) {
      throw ErroPersonalizado.criar({
        mensagem: "Post não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (input.titulo !== undefined) post.titulo = input.titulo.trim();
    if (input.resumo !== undefined) post.resumo = input.resumo.trim();
    if (input.conteudo !== undefined) post.conteudo = normalizarConteudoBlog(input.conteudo);
    if (input.imagemCapaUrl !== undefined) {
      post.imagemCapaUrl = input.imagemCapaUrl.trim() || undefined;
    }
    if (input.publicado !== undefined) post.publicado = input.publicado;
    if (input.publicadoEm !== undefined) post.publicadoEm = input.publicadoEm;

    if (input.slug !== undefined || input.titulo !== undefined) {
      const slugBase = gerarSlug(input.slug?.trim() || post.titulo);
      post.slug = await garantirSlugUnico(this.postBlogGateway, slugBase, post.id);
    }

    post.atualizadoEm = new Date();
    await this.postBlogGateway.atualizar(post);
    return mapPost(post);
  }
}

export class ExcluirPostBlog implements CasoDeUso<{ id: string }, { mensagem: string }> {
  private constructor(private readonly postBlogGateway: PostBlogGateway) {}

  public static criar(postBlogGateway: PostBlogGateway) {
    return new ExcluirPostBlog(postBlogGateway);
  }

  public async executar(input: { id: string }): Promise<{ mensagem: string }> {
    const post = await this.postBlogGateway.buscarPorId(input.id);
    if (!post) {
      throw ErroPersonalizado.criar({
        mensagem: "Post não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    await this.postBlogGateway.excluir(input.id);
    return { mensagem: "Post excluído com sucesso." };
  }
}
