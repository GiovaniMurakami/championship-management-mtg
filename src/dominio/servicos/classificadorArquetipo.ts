import { Carta, Deck } from "../entidade/deck";

const PESO_MAINDECK = 1;
const PESO_SIDEBOARD = 0.25;
const PESO_COMMANDER = 1.5;
const CONFIANCA_MINIMA = 0.62;
const VANTAGEM_MINIMA = 0.08;
const CARTAS_RELEVANTES_MINIMAS = 6;
const TERRENOS_BASICOS = new Set([
  "plains", "island", "swamp", "mountain", "forest", "wastes",
  "snow-covered plains", "snow-covered island", "snow-covered swamp",
  "snow-covered mountain", "snow-covered forest",
]);

export type ClassificacaoArquetipo = {
  nomeConsolidado: string | null;
  confianca: number;
  segundaConfianca: number;
  cartasRelevantesEmComum: number;
};

function adicionarCartas(vetor: Map<string, number>, cartas: Carta[], peso: number): void {
  for (const carta of cartas) {
    const nome = carta.nome.trim().toLowerCase();
    if (!nome || TERRENOS_BASICOS.has(nome)) continue;
    vetor.set(nome, (vetor.get(nome) ?? 0) + carta.quantidade * peso);
  }
}

function vetorDeck(deck: Pick<Deck, "maindeck" | "sideboard" | "commander">): Map<string, number> {
  const vetor = new Map<string, number>();
  adicionarCartas(vetor, deck.maindeck, PESO_MAINDECK);
  adicionarCartas(vetor, deck.sideboard, PESO_SIDEBOARD);
  adicionarCartas(vetor, deck.commander, PESO_COMMANDER);
  return vetor;
}

function similaridadeJaccardPonderada(a: Map<string, number>, b: Map<string, number>) {
  const cartas = new Set([...a.keys(), ...b.keys()]);
  let intersecao = 0;
  let uniao = 0;
  let comuns = 0;
  for (const carta of cartas) {
    const pesoA = a.get(carta) ?? 0;
    const pesoB = b.get(carta) ?? 0;
    intersecao += Math.min(pesoA, pesoB);
    uniao += Math.max(pesoA, pesoB);
    if (pesoA > 0 && pesoB > 0) comuns += 1;
  }
  return { score: uniao > 0 ? intersecao / uniao : 0, comuns };
}

/**
 * Usa apenas referências cujo nome consolidado difere do nome livre do usuário.
 * Essa é a indicação disponível hoje de que houve curadoria administrativa.
 */
export function classificarArquetipo(
  deck: Pick<Deck, "maindeck" | "sideboard" | "commander">,
  referencias: Deck[],
): ClassificacaoArquetipo {
  const alvo = vetorDeck(deck);
  const melhorPorArquetipo = new Map<string, { score: number; comuns: number }>();

  for (const referencia of referencias) {
    const consolidado = referencia.nomeConsolidado?.trim();
    if (!consolidado || consolidado.localeCompare(referencia.nome.trim(), "pt-BR", { sensitivity: "base" }) === 0) continue;
    const similaridade = similaridadeJaccardPonderada(alvo, vetorDeck(referencia));
    const atual = melhorPorArquetipo.get(consolidado);
    if (!atual || similaridade.score > atual.score) melhorPorArquetipo.set(consolidado, similaridade);
  }

  const ranking = [...melhorPorArquetipo.entries()]
    .map(([nome, valor]) => ({ nome, ...valor }))
    .sort((a, b) => b.score - a.score || b.comuns - a.comuns || a.nome.localeCompare(b.nome, "pt-BR"));
  const melhor = ranking[0];
  const segundo = ranking[1];
  const segundaConfianca = segundo?.score ?? 0;
  const aprovado = Boolean(
    melhor
    && melhor.score >= CONFIANCA_MINIMA
    && melhor.comuns >= CARTAS_RELEVANTES_MINIMAS
    && melhor.score - segundaConfianca >= VANTAGEM_MINIMA
  );

  return {
    nomeConsolidado: aprovado ? melhor.nome : null,
    confianca: melhor?.score ?? 0,
    segundaConfianca,
    cartasRelevantesEmComum: melhor?.comuns ?? 0,
  };
}
