/** Domínios de escrita dos quais cada resposta em cache depende. */
export type DominioCache = "torneios" | "inscricoes" | "partidas" | "usuarios" | "decks" | "times" | "ligas" | "site" | "metagame" | "visualizacoesTorneio";

export function dependenciasCache(pk: string): string[] {
  if (pk.startsWith("torneio#")) return ["torneios", "inscricoes", "partidas", "usuarios", "decks", "times"];
  if (pk === "torneios") return ["torneios", "inscricoes", "visualizacoesTorneio"];
  if (pk === "metagame") return ["metagame", "torneios", "inscricoes", "partidas", "decks", "usuarios"];
  if (pk === "ligas") return ["ligas", "torneios", "inscricoes", "partidas", "decks", "usuarios", "times"];
  return [pk];
}

export function dominioParticao(pk: string): string {
  return pk.startsWith("torneio#") ? "torneios" : pk;
}
