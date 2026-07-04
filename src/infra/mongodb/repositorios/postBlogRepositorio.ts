import mongoose, { Schema, Document } from "mongoose";
import { PostBlog } from "../../../dominio/entidade/postBlog";
import { FiltrosListarPostsBlog, PostBlogGateway } from "../../../dominio/gateway/postBlogGateway";
import { BaseRepositorio } from "./baseRepositorio";

interface PostBlogDocument extends Document {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  imagemCapaUrl?: string;
  publicado: boolean;
  autorId?: string;
  autorNome?: string;
  wordpressId?: number;
  publicadoEm: Date;
  criadoEm: Date;
  atualizadoEm: Date;
}

const postBlogSchema = new Schema<PostBlogDocument>({
  id: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true, maxlength: 140 },
  titulo: { type: String, required: true, maxlength: 220 },
  resumo: { type: String, required: true, maxlength: 600 },
  conteudo: { type: String, required: true, maxlength: 120000 },
  imagemCapaUrl: { type: String, maxlength: 800 },
  publicado: { type: Boolean, default: true },
  autorId: { type: String },
  autorNome: { type: String, maxlength: 120 },
  wordpressId: { type: Number },
  publicadoEm: { type: Date, default: Date.now },
  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now },
});

postBlogSchema.index({ publicadoEm: -1, id: 1 });
postBlogSchema.index({ publicado: 1, publicadoEm: -1, id: 1 });
postBlogSchema.index({ wordpressId: 1 }, { unique: true, sparse: true });

const PostBlogModel =
  mongoose.models.PostBlog || mongoose.model<PostBlogDocument>("PostBlog", postBlogSchema);

function docParaPostBlog(doc: PostBlogDocument): PostBlog {
  return new PostBlog({
    id: doc.get("id"),
    slug: doc.get("slug"),
    titulo: doc.get("titulo"),
    resumo: doc.get("resumo"),
    conteudo: doc.get("conteudo"),
    imagemCapaUrl: doc.get("imagemCapaUrl") ?? undefined,
    publicado: doc.get("publicado") ?? true,
    autorId: doc.get("autorId") ?? undefined,
    autorNome: doc.get("autorNome") ?? undefined,
    wordpressId: doc.get("wordpressId") ?? undefined,
    publicadoEm: doc.get("publicadoEm"),
    criadoEm: doc.get("criadoEm"),
    atualizadoEm: doc.get("atualizadoEm"),
  });
}

export class PostBlogRepositorio extends BaseRepositorio implements PostBlogGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new PostBlogRepositorio();
  }

  public async salvar(post: PostBlog): Promise<void> {
    await this.conectar();
    await PostBlogModel.create({
      id: post.id,
      slug: post.slug,
      titulo: post.titulo,
      resumo: post.resumo,
      conteudo: post.conteudo,
      imagemCapaUrl: post.imagemCapaUrl,
      publicado: post.publicado,
      autorId: post.autorId,
      autorNome: post.autorNome,
      wordpressId: post.wordpressId,
      publicadoEm: post.publicadoEm,
      criadoEm: post.criadoEm,
      atualizadoEm: post.atualizadoEm,
    });
  }

  public async buscarPorId(id: string): Promise<PostBlog | null> {
    await this.conectar();
    const doc = await PostBlogModel.findOne({ id });
    if (!doc) return null;
    return docParaPostBlog(doc as unknown as PostBlogDocument);
  }

  public async buscarPorSlug(slug: string): Promise<PostBlog | null> {
    await this.conectar();
    const doc = await PostBlogModel.findOne({ slug });
    if (!doc) return null;
    return docParaPostBlog(doc as unknown as PostBlogDocument);
  }

  public async buscarPorWordpressId(wordpressId: number): Promise<PostBlog | null> {
    await this.conectar();
    const doc = await PostBlogModel.findOne({ wordpressId });
    if (!doc) return null;
    return docParaPostBlog(doc as unknown as PostBlogDocument);
  }

  public async listar(filtros: FiltrosListarPostsBlog = {}): Promise<PostBlog[]> {
    await this.conectar();
    const filtroQuery: Record<string, unknown> = {};
    if (filtros.apenasPublicados) filtroQuery.publicado = true;

    let find = PostBlogModel.find(filtroQuery).sort({ publicadoEm: -1, id: 1 });
    if (filtros.offset !== undefined) find = find.skip(filtros.offset);
    if (filtros.limite !== undefined) find = find.limit(filtros.limite);

    const docs = await find;
    return docs.map((doc) => docParaPostBlog(doc as unknown as PostBlogDocument));
  }

  public async listarTotal(apenasPublicados = false): Promise<number> {
    await this.conectar();
    const filtroQuery: Record<string, unknown> = {};
    if (apenasPublicados) filtroQuery.publicado = true;
    return PostBlogModel.countDocuments(filtroQuery);
  }

  public async atualizar(post: PostBlog): Promise<void> {
    await this.conectar();
    await PostBlogModel.updateOne(
      { id: post.id },
      {
        slug: post.slug,
        titulo: post.titulo,
        resumo: post.resumo,
        conteudo: post.conteudo,
        imagemCapaUrl: post.imagemCapaUrl,
        publicado: post.publicado,
        autorNome: post.autorNome,
        publicadoEm: post.publicadoEm,
        atualizadoEm: post.atualizadoEm,
      }
    );
  }

  public async excluir(id: string): Promise<void> {
    await this.conectar();
    await PostBlogModel.deleteOne({ id });
  }
}
