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

export type AnuncioDiarioSite = {
  ativo: boolean;
  imagemUrl: string;
  link: string;
  visualizacoes: number;
  cliques: number;
  atualizadoEm?: Date;
};

export interface SiteConfigGateway {
  buscarAnuncios(): Promise<AnunciosSiteConfig | null>;
  salvarAnuncios(config: AnunciosSiteConfig): Promise<AnunciosSiteConfig>;
  registrarCliqueAnuncio(anuncioId: string): Promise<AnunciosSiteConfig | null>;
  buscarAnuncioDiario(): Promise<AnuncioDiarioSite | null>;
  salvarAnuncioDiario(config: AnuncioDiarioSite): Promise<AnuncioDiarioSite>;
  registrarVisualizacaoAnuncioDiario(): Promise<AnuncioDiarioSite | null>;
  registrarCliqueAnuncioDiario(): Promise<AnuncioDiarioSite | null>;
}
