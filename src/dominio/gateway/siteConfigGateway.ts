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

export interface SiteConfigGateway {
  buscarAnuncios(): Promise<AnunciosSiteConfig | null>;
  salvarAnuncios(config: AnunciosSiteConfig): Promise<AnunciosSiteConfig>;
  registrarCliqueAnuncio(anuncioId: string): Promise<AnunciosSiteConfig | null>;
  buscarAnuncioDiario(): Promise<AnuncioDiarioSite | null>;
  salvarAnuncioDiario(config: AnuncioDiarioSite): Promise<AnuncioDiarioSite>;
  registrarVisualizacaoAnuncioDiario(anuncioId: string): Promise<AnuncioDiarioSite | null>;
  registrarCliqueAnuncioDiario(anuncioId: string): Promise<AnuncioDiarioSite | null>;
}
