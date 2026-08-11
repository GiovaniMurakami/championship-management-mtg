import { AnuncioSite } from "../../dominio/gateway/siteConfigGateway";

export function mapearAnuncioPublico(anuncio: AnuncioSite): Omit<AnuncioSite, "cliques"> {
  const { cliques: _cliques, ...publico } = anuncio;
  return publico;
}

export function mapearAnunciosSite(
  anuncios: AnuncioSite[],
  incluirCliques: boolean
): AnuncioSite[] {
  if (incluirCliques) return anuncios;
  return anuncios.map(mapearAnuncioPublico);
}
