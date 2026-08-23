import { calcularDeltaElo, classificarRankingRanqueado, criarPartidaRanqueada, divisaoRanqueada, EntradaFilaRanqueada, RankingRanqueado } from "../../../src/dominio/entidade/ranqueada";

const entrada = (jogadorId: string, rating: number): EntradaFilaRanqueada => ({
  jogadorId, jogadorNome: jogadorId, deckId: `${jogadorId}-deck`, deckNome: "Deck",
  deckSnapshot: { id: `${jogadorId}-deck`, nome: "Deck", formato: "modern", maindeck: [], sideboard: [], commander: [] },
  formato: "modern", vitoriasCampanha: 0, derrotasCampanha: 0, partidasCampanha: 0, rating,
  ultimoOponenteId: null, divisao: divisaoRanqueada(rating),
  entrouEm: new Date().toISOString(),
});

describe("ranqueada", () => {
  it.each([[999, "Bronze"], [1000, "Prata"], [1200, "Ouro"], [1400, "Platina"], [1600, "Diamante"], [1800, "Diamante"]])("converte %i na divisão base %s", (rating, divisao) => {
    expect(divisaoRanqueada(rating)).toBe(divisao);
  });

  it("limita Fuguete aos 25 melhores jogadores com pelo menos 1800", () => {
    const rankings: RankingRanqueado[] = Array.from({ length: 26 }, (_, i) => ({ jogadorId: `j${String(i).padStart(2, "0")}`, jogadorNome: `J${i}`, formato: "modern", rating: 1825 - i, vitorias: 0, derrotas: 0, empates: 0, atualizadoEm: new Date().toISOString() }));
    const classificados = classificarRankingRanqueado(rankings);
    expect(classificados.filter((item) => item.divisao === "Fuguete")).toHaveLength(25);
    expect(classificados[25].divisao).toBe("Diamante");
  });

  it("premia mais uma vitória improvável e mantém Elo em soma zero", () => {
    const deltaFavorito = calcularDeltaElo(1400, 1000, 1);
    const deltaAzarao = calcularDeltaElo(1000, 1400, 1);
    expect(deltaAzarao).toBeGreaterThan(deltaFavorito);
    expect(calcularDeltaElo(1400, 1000, 0)).toBe(-deltaAzarao);
  });

  it("grava as badges dos jogadores no pareamento", () => {
    const jogadorA = entrada("a", 1800); jogadorA.divisao = "Fuguete";
    const partida = criarPartidaRanqueada(jogadorA, entrada("b", 1200));
    expect(partida.jogador1Divisao).toBe("Fuguete");
    expect(partida.jogador2Divisao).toBe("Ouro");
  });
});
