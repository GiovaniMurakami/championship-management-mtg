import { PostBlog } from "../../dominio/entidade/postBlog";
import { PostBlogGateway } from "../../dominio/gateway/postBlogGateway";
import { CasoDeUso } from "../casoDeUso";
import { htmlParaTexto } from "../../helpers/texto/htmlParaTexto";

const WORDPRESS_POSTS_URL =
  "https://tiagofuguete.com.br/wp-json/wp/v2/posts?per_page=100&_embed";

type WordpressPost = {
  id: number;
  slug: string;
  date: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: {
    author?: Array<{ name?: string }>;
    "wp:featuredmedia"?: Array<{ source_url?: string }>;
  };
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, "\"")
    .replace(/&#8221;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"");
}

function stripTags(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function montarResumo(excerptHtml: string, conteudoHtml: string): string {
  const excerpt = htmlParaTexto(stripTags(excerptHtml));
  if (excerpt) return excerpt.slice(0, 500);
  return htmlParaTexto(conteudoHtml).slice(0, 500);
}

export class ImportarPostsWordpress implements CasoDeUso<void, { importados: number; ignorados: number }> {
  private constructor(private readonly postBlogGateway: PostBlogGateway) {}

  public static criar(postBlogGateway: PostBlogGateway) {
    return new ImportarPostsWordpress(postBlogGateway);
  }

  public async executar(): Promise<{ importados: number; ignorados: number }> {
    const response = await fetch(WORDPRESS_POSTS_URL);
    if (!response.ok) {
      throw new Error(`Falha ao buscar posts do WordPress (${response.status}).`);
    }

    const posts = (await response.json()) as WordpressPost[];
    let importados = 0;
    let ignorados = 0;

    for (const wpPost of posts) {
      const existente = await this.postBlogGateway.buscarPorWordpressId(wpPost.id);
      if (existente) {
        ignorados += 1;
        continue;
      }

      const titulo = stripTags(wpPost.title.rendered);
      const resumo = montarResumo(wpPost.excerpt.rendered, wpPost.content.rendered);
      const imagemCapaUrl = wpPost._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
      const autorNome = wpPost._embedded?.author?.[0]?.name;

      const post = PostBlog.criar({
        slug: wpPost.slug,
        titulo,
        resumo,
        conteudo: wpPost.content.rendered,
        imagemCapaUrl,
        autorNome,
        wordpressId: wpPost.id,
        publicado: true,
        publicadoEm: new Date(wpPost.date),
      });

      await this.postBlogGateway.salvar(post);
      importados += 1;
    }

    return { importados, ignorados };
  }
}
