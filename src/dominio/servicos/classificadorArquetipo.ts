import { Carta, Deck } from "../entidade/deck";

const PESO_MAINDECK = 1;
const PESO_SIDEBOARD = 0.25;
const PESO_COMMANDER = 1.5;
const CONFIANCA_MINIMA = 0.62;
const VANTAGEM_MINIMA = 0.005;
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

type DeckParaClassificar = Pick<Deck, "maindeck" | "sideboard" | "commander">;
type ReferenciaClassificada = {
  nomeConsolidado: string;
  vetor: Map<string, number>;
};
type CentroideArquetipo = {
  nome: string;
  vetor: Map<string, number>;
  referencias: Map<string, number>[];
};

function normalizarNome(nome: string): string {
  return nome.trim().toLowerCase();
}

function adicionarCartas(vetor: Map<string, number>, cartas: Carta[], peso: number): void {
  for (const carta of cartas) {
    const nome = normalizarNome(carta.nome);
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

function calcularIdf(referencias: ReferenciaClassificada[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const referencia of referencias) {
    for (const carta of new Set(referencia.vetor.keys())) {
      df.set(carta, (df.get(carta) ?? 0) + 1);
    }
  }

  const total = referencias.length;
  const idf = new Map<string, number>();
  for (const [carta, frequencia] of df) {
    idf.set(carta, Math.log((1 + total) / (1 + frequencia)) + 1);
  }

  return idf;
}

function aplicarIdf(vetor: Map<string, number>, idf: Map<string, number>, totalReferencias: number): Map<string, number> {
  const ponderado = new Map<string, number>();
  const idfDesconhecido = Math.log(1 + totalReferencias) + 1;

  for (const [carta, peso] of vetor) {
    ponderado.set(carta, peso * (idf.get(carta) ?? idfDesconhecido));
  }

  return ponderado;
}

function somarNoVetor(destino: Map<string, number>, origem: Map<string, number>): void {
  for (const [carta, peso] of origem) {
    destino.set(carta, (destino.get(carta) ?? 0) + peso);
  }
}

function criarCentroides(referencias: ReferenciaClassificada[], idf: Map<string, number>): CentroideArquetipo[] {
  const grupos = new Map<string, { soma: Map<string, number>; total: number; referencias: Map<string, number>[] }>();

  for (const referencia of referencias) {
    const ponderado = aplicarIdf(referencia.vetor, idf, referencias.length);
    const grupo = grupos.get(referencia.nomeConsolidado) ?? { soma: new Map<string, number>(), total: 0, referencias: [] };
    somarNoVetor(grupo.soma, ponderado);
    grupo.total += 1;
    grupo.referencias.push(ponderado);
    grupos.set(referencia.nomeConsolidado, grupo);
  }

  return [...grupos.entries()].map(([nome, grupo]) => {
    const vetor = new Map<string, number>();
    for (const [carta, peso] of grupo.soma) {
      vetor.set(carta, peso / grupo.total);
    }
    return { nome, vetor, referencias: grupo.referencias };
  });
}

function similaridadeCosseno(a: Map<string, number>, b: Map<string, number>) {
  let produto = 0;
  let normaA = 0;
  let normaB = 0;
  let comuns = 0;

  for (const pesoA of a.values()) {
    normaA += pesoA * pesoA;
  }

  for (const pesoB of b.values()) {
    normaB += pesoB * pesoB;
  }

  for (const carta of a.keys()) {
    const pesoA = a.get(carta) ?? 0;
    const pesoB = b.get(carta) ?? 0;
    if (pesoB <= 0) continue;
    produto += pesoA * pesoB;
    comuns += 1;
  }

  return {
    score: normaA > 0 && normaB > 0 ? produto / Math.sqrt(normaA * normaB) : 0,
    comuns,
  };
}

/**
 * Usa apenas referências cujo nome consolidado difere do nome livre do usuário.
 * Essa é a indicação disponível hoje de que houve curadoria administrativa.
 *
 * As referências são agrupadas por nome consolidado e transformadas em centroides
 * TF-IDF: cartas frequentes em muitos decks pesam menos, cartas mais distintivas
 * pesam mais, e cada arquétipo passa a ser comparado pelo perfil médio das suas
 * listas reais.
 */
export function classificarArquetipo(
  deck: DeckParaClassificar,
  referencias: Deck[],
): ClassificacaoArquetipo {
  const referenciasClassificadas: ReferenciaClassificada[] = [];

  for (const referencia of referencias) {
    const consolidado = referencia.nomeConsolidado?.trim();
    if (!consolidado || consolidado.localeCompare(referencia.nome.trim(), "pt-BR", { sensitivity: "base" }) === 0) continue;
    referenciasClassificadas.push({
      nomeConsolidado: consolidado,
      vetor: vetorDeck(referencia),
    });
  }

  const idf = calcularIdf(referenciasClassificadas);
  const alvo = aplicarIdf(vetorDeck(deck), idf, referenciasClassificadas.length);
  const centroides = criarCentroides(referenciasClassificadas, idf);

  const ranking = centroides
    .map((centroide) => {
      const peloCentroide = similaridadeCosseno(alvo, centroide.vetor);
      const peloExemplar = centroide.referencias
        .map((referencia) => similaridadeCosseno(alvo, referencia))
        .sort((a, b) => b.score - a.score || b.comuns - a.comuns)[0] ?? { score: 0, comuns: 0 };
      const melhor = peloExemplar.score > peloCentroide.score ? peloExemplar : peloCentroide;

      return {
        nome: centroide.nome,
        ...melhor,
      };
    })
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
