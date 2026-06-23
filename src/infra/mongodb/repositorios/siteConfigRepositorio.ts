import mongoose, { Document, Schema } from "mongoose";
import {
  AnuncioSite,
  AnunciosSiteConfig,
  SiteConfigGateway,
  TipoAnuncioSite,
} from "../../../dominio/gateway/siteConfigGateway";
import { BaseRepositorio } from "./baseRepositorio";

const ANUNCIOS_KEY = "anuncios";

interface SiteConfigDocument extends Document {
  chave: string;
  anuncios: AnuncioSite[];
  atualizadoEm?: Date;
}

const anuncioSchema = new Schema<AnuncioSite>({
  id: { type: String, required: true },
  tipo: { type: String, enum: ["card", "banner"], required: true, default: "card" },
  tag: { type: String, maxlength: 80 },
  titulo: { type: String, default: "", maxlength: 180 },
  texto: { type: String, maxlength: 900 },
  imagemUrl: { type: String, maxlength: 800 },
  link: { type: String, maxlength: 800 },
  botaoTexto: { type: String, maxlength: 120 },
  ativo: { type: Boolean, default: true },
  ordem: { type: Number, default: 0 },
  cliques: { type: Number, default: 0, min: 0 },
}, { _id: false });

const siteConfigSchema = new Schema<SiteConfigDocument>({
  chave: { type: String, required: true, unique: true },
  anuncios: { type: [anuncioSchema], default: [] },
  atualizadoEm: { type: Date },
});

const SiteConfigModel =
  mongoose.models.SiteConfig ||
  mongoose.model<SiteConfigDocument>("SiteConfig", siteConfigSchema);

const docParaConfig = (doc: SiteConfigDocument): AnunciosSiteConfig => ({
  anuncios: (doc.get("anuncios") ?? []).map((item: AnuncioSite) => ({
    id: item.id,
    tipo: (item.tipo as TipoAnuncioSite) ?? "card",
    tag: item.tag ?? undefined,
    titulo: item.titulo ?? "",
    texto: item.texto ?? undefined,
    imagemUrl: item.imagemUrl ?? undefined,
    link: item.link ?? undefined,
    botaoTexto: item.botaoTexto ?? undefined,
    ativo: item.ativo !== false,
    ordem: item.ordem ?? 0,
    cliques: Number.isFinite(item.cliques) ? Number(item.cliques) : 0,
  })),
  atualizadoEm: doc.get("atualizadoEm") ?? undefined,
});

export class SiteConfigRepositorio extends BaseRepositorio implements SiteConfigGateway {
  private constructor() { super(); }

  public static criar() {
    return new SiteConfigRepositorio();
  }

  public async buscarAnuncios(): Promise<AnunciosSiteConfig | null> {
    await this.conectar();
    const doc = await SiteConfigModel.findOne({ chave: ANUNCIOS_KEY });
    if (!doc) return null;
    return docParaConfig(doc as unknown as SiteConfigDocument);
  }

  public async salvarAnuncios(config: AnunciosSiteConfig): Promise<AnunciosSiteConfig> {
    await this.conectar();
    const doc = await SiteConfigModel.findOneAndUpdate(
      { chave: ANUNCIOS_KEY },
      {
        chave: ANUNCIOS_KEY,
        anuncios: config.anuncios,
        atualizadoEm: config.atualizadoEm ?? new Date(),
      },
      { new: true, upsert: true }
    );

    return docParaConfig(doc as unknown as SiteConfigDocument);
  }

  public async registrarCliqueAnuncio(anuncioId: string): Promise<AnunciosSiteConfig | null> {
    await this.conectar();
    const doc = await SiteConfigModel.findOneAndUpdate(
      { chave: ANUNCIOS_KEY, "anuncios.id": anuncioId },
      { $inc: { "anuncios.$.cliques": 1 } },
      { new: true }
    );

    if (!doc) return null;
    return docParaConfig(doc as unknown as SiteConfigDocument);
  }
}
