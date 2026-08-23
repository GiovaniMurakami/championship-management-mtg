export const CACHE_PK_METAGAME = "metagame";
export const CACHE_PK_TORNEIOS = "torneios";
export const CACHE_PK_LIGAS = "ligas";
export const CACHE_PK_SITE = "site";

export function cachePkTorneio(torneioId: string): string {
  return `torneio#${torneioId}`;
}

function normalizarParte(valor: string | number | undefined | null): string {
  return encodeURIComponent(String(valor ?? ""));
}

export function cacheSkMetagameLista(formato: string, dias: number): string {
  return `lista#formato=${normalizarParte(formato.toLowerCase())}#dias=${dias}`;
}

export function cacheSkMetagameArquetipo(formato: string, slug: string, dias: number): string {
  return `arquetipo#formato=${normalizarParte(formato.toLowerCase())}#slug=${normalizarParte(slug.toLowerCase())}#dias=${dias}`;
}

export function cacheSkStandings(): string {
  return "standings";
}

export function cacheSkPartidas(rodada?: number): string {
  return rodada === undefined ? "partidas#todas" : `partidas#rodada=${rodada}`;
}

export function cacheSkListarTorneios(filtros: Record<string, unknown>): string {
  return `listar#${normalizarParte(JSON.stringify(ordenarObjeto(filtros)))}`;
}

export function cacheSkSeoTorneio(): string {
  return "seo";
}

export function cacheSkRankingLiga(ligaId: string, filtros: Record<string, unknown>): string {
  return `ranking#liga=${normalizarParte(ligaId)}#${normalizarParte(JSON.stringify(ordenarObjeto(filtros)))}`;
}

export function cacheSkAnunciosSite(incluirCliques: boolean): string {
  return `anuncios#incluirCliques=${incluirCliques ? "1" : "0"}`;
}

function ordenarObjeto(valor: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(valor)
    .sort()
    .reduce<Record<string, unknown>>((acc, chave) => {
      acc[chave] = valor[chave];
      return acc;
    }, {});
}
