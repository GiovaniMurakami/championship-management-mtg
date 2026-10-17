export type TipoAnuncioSite = "card" | "banner";

export type AnuncioSite = {
  id: string;
  tipo: TipoAnuncioSite;
  tag?: string;
  titulo: string;
  texto?: string;
  imagemUrl?: string;
  link?: string;
  botaoTexto?: string;
  ativo: boolean;
  ordem: number;
  cliques?: number;
};

export type AnunciosSiteConfig = {
  anuncios: AnuncioSite[];
  atualizadoEm?: Date;
};

export type AnuncioDiarioItem = {
  id: string;
  imagemUrl: string;
  link: string;
  ativo: boolean;
  ordem: number;
  visualizacoes: number;
  cliques: number;
};

export type AnuncioDiarioSite = {
  anuncios: AnuncioDiarioItem[];
  atualizadoEm?: Date;
};

/** Chave: `${formato}#${slug}` → nome/id Scryfall da carta. */
export type MetagameOverridesConfig = {
  cartasRepresentativas: Record<string, string>;
  atualizadoEm?: Date;
};

export type SlideHomeSite = {
  id: string;
  imagemUrl: string;
  titulo: string;
  texto?: string;
  ctaTexto?: string;
  ctaUrl?: string;
  ordem: number;
  ativo: boolean;
};

export type SlidesHomeConfig = {
  slides: SlideHomeSite[];
  atualizadoEm?: Date;
};

export type ParceiroSite = {
  id: string;
  nome: string;
  logoUrl: string;
  linkUrl: string;
  cupom?: string;
  ordem: number;
  ativo: boolean;
};

export type ParceirosSiteConfig = {
  parceiros: ParceiroSite[];
  cupomGlobal?: string;
  /** Textos da página /parceiros */
  paginaTitulo?: string;
  paginaTexto?: string;
  ctaTitulo?: string;
  ctaTexto?: string;
  contatoEmail?: string;
  atualizadoEm?: Date;
};

export type SobreMimConfig = {
  tituloHistoria: string;
  historia: string;
  fotoUrl: string;
  apoiaTitulo: string;
  apoiaTexto: string;
  apoiaImagemUrl: string;
  apoiaUrl: string;
  galeriaTitulo: string;
  galeriaUrls: string[];
  agradecimentoTitulo: string;
  agradecimentoTexto: string;
  /** Nomes separados por "; " */
  apoiadores: string;
  atualizadoEm?: Date;
};

export type SecaoTextoHome = {
  titulo: string;
  texto: string;
};

export type ConteudoHomeConfig = {
  youtube: SecaoTextoHome;
  twitch: SecaoTextoHome;
  artigos: SecaoTextoHome;
  parceiros: SecaoTextoHome;
  /** UUID do usuário cujos decks públicos aparecem em /decks-fuguete */
  fugueteUsuarioId?: string;
  atualizadoEm?: Date;
};

export interface SiteConfigGateway {
  buscarAnuncios(): Promise<AnunciosSiteConfig | null>;
  salvarAnuncios(config: AnunciosSiteConfig): Promise<AnunciosSiteConfig>;
  registrarCliqueAnuncio(anuncioId: string): Promise<AnunciosSiteConfig | null>;
  buscarAnuncioDiario(): Promise<AnuncioDiarioSite | null>;
  salvarAnuncioDiario(config: AnuncioDiarioSite): Promise<AnuncioDiarioSite>;
  registrarVisualizacaoAnuncioDiario(anuncioId: string): Promise<AnuncioDiarioSite | null>;
  registrarCliqueAnuncioDiario(anuncioId: string): Promise<AnuncioDiarioSite | null>;
  buscarMetagameOverrides(): Promise<MetagameOverridesConfig | null>;
  salvarMetagameOverrides(config: MetagameOverridesConfig): Promise<MetagameOverridesConfig>;
  buscarSlidesHome(): Promise<SlidesHomeConfig | null>;
  salvarSlidesHome(config: SlidesHomeConfig): Promise<SlidesHomeConfig>;
  buscarParceiros(): Promise<ParceirosSiteConfig | null>;
  salvarParceiros(config: ParceirosSiteConfig): Promise<ParceirosSiteConfig>;
  buscarConteudoHome(): Promise<ConteudoHomeConfig | null>;
  salvarConteudoHome(config: ConteudoHomeConfig): Promise<ConteudoHomeConfig>;
  buscarSobreMim(): Promise<SobreMimConfig | null>;
  salvarSobreMim(config: SobreMimConfig): Promise<SobreMimConfig>;
}
