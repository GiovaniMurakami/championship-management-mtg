import { randomUUID } from "crypto";

export type PostBlogProps = {
  id?: string;
  slug: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  imagemCapaUrl?: string;
  publicado?: boolean;
  autorId?: string;
  autorNome?: string;
  wordpressId?: number;
  publicadoEm?: Date;
  criadoEm?: Date;
  atualizadoEm?: Date;
};

export class PostBlog {
  public id: string;
  public slug: string;
  public titulo: string;
  public resumo: string;
  public conteudo: string;
  public imagemCapaUrl?: string;
  public publicado: boolean;
  public autorId?: string;
  public autorNome?: string;
  public wordpressId?: number;
  public publicadoEm: Date;
  public criadoEm: Date;
  public atualizadoEm: Date;

  constructor(props: PostBlogProps) {
    this.id = props.id ?? randomUUID();
    this.slug = props.slug;
    this.titulo = props.titulo;
    this.resumo = props.resumo;
    this.conteudo = props.conteudo;
    this.imagemCapaUrl = props.imagemCapaUrl;
    this.publicado = props.publicado ?? true;
    this.autorId = props.autorId;
    this.autorNome = props.autorNome;
    this.wordpressId = props.wordpressId;
    this.publicadoEm = props.publicadoEm ?? new Date();
    this.criadoEm = props.criadoEm ?? new Date();
    this.atualizadoEm = props.atualizadoEm ?? new Date();
  }

  public static criar(props: PostBlogProps): PostBlog {
    return new PostBlog(props);
  }
}
