export const CORES_MANA = ["W", "U", "B", "R", "G"] as const;
export type CorMana = (typeof CORES_MANA)[number];

const TERRENO_BASICO: Record<string, CorMana> = {
  plains: "W",
  island: "U",
  swamp: "B",
  mountain: "R",
  forest: "G",
  "snow-covered plains": "W",
  "snow-covered island": "U",
  "snow-covered swamp": "B",
  "snow-covered mountain": "R",
  "snow-covered forest": "G",
};

export function normalizarCores(cores?: string[] | null): CorMana[] {
  const set = new Set<CorMana>();
  for (const valor of cores ?? []) {
    const cor = String(valor || "").trim().toUpperCase();
    if ((CORES_MANA as readonly string[]).includes(cor)) {
      set.add(cor as CorMana);
    }
  }
  return CORES_MANA.filter((cor) => set.has(cor));
}

export function inferirCoresDeNomes(nomes: string[]): CorMana[] {
  const set = new Set<CorMana>();
  for (const nome of nomes) {
    const basico = TERRENO_BASICO[String(nome || "").trim().toLowerCase()];
    if (basico) set.add(basico);
  }
  return CORES_MANA.filter((cor) => set.has(cor));
}

export function coresDoArquetipo(
  decks: Array<{ cores?: string[] | null }>,
  nomesCartasCores: string[],
): CorMana[] {
  const uniao = new Set<CorMana>();
  for (const deck of decks) {
    for (const cor of normalizarCores(deck.cores)) uniao.add(cor);
  }
  if (uniao.size > 0) return CORES_MANA.filter((cor) => uniao.has(cor));
  return inferirCoresDeNomes(nomesCartasCores);
}
