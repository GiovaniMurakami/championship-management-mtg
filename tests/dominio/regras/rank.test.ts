import {
  calcularVariacaoRank,
  calcularResultadoRankPartida,
  obterRankPorPontos,
  PONTOS_RANK_INICIAL,
} from "../../../src/dominio/regras/rank";

describe("rank", () => {
  describe("obterRankPorPontos", () => {
    it("classifica tiers corretamente", () => {
      expect(obterRankPorPontos(0)).toBe("bronze");
      expect(obterRankPorPontos(499)).toBe("bronze");
      expect(obterRankPorPontos(500)).toBe("prata");
      expect(obterRankPorPontos(999)).toBe("prata");
      expect(obterRankPorPontos(1000)).toBe("ouro");
      expect(obterRankPorPontos(1499)).toBe("ouro");
      expect(obterRankPorPontos(1500)).toBe("foguete");
    });
  });

  describe("calcularVariacaoRank", () => {
    it("prata vs prata troca poucos pontos", () => {
      const variacao = calcularVariacaoRank(750, 800);
      expect(variacao).toEqual({ ganhoVencedor: 12, perdaPerdedor: 12 });
    });

    it("foguete perde muito ao perder para prata", () => {
      const variacao = calcularVariacaoRank(750, 1600);
      expect(variacao.perdaPerdedor).toBeGreaterThan(30);
      expect(variacao.ganhoVencedor).toBeGreaterThan(variacao.perdaPerdedor / 2);
    });

    it("foguete vence bronze com pouca troca", () => {
      const variacao = calcularVariacaoRank(1600, 200);
      expect(variacao.ganhoVencedor).toBeLessThanOrEqual(12);
      expect(variacao.perdaPerdedor).toBeLessThanOrEqual(12);
    });
  });

  describe("calcularResultadoRankPartida", () => {
    it("retorna null em empate", () => {
      expect(
        calcularResultadoRankPartida({
          jogador1Id: "j1",
          jogador2Id: "j2",
          vitoriasJogador1: 1,
          vitoriasJogador2: 1,
          pontosJogador1: PONTOS_RANK_INICIAL,
          pontosJogador2: PONTOS_RANK_INICIAL,
        })
      ).toBeNull();
    });

    it("aplica delta positivo ao vencedor e negativo ao perdedor", () => {
      const resultado = calcularResultadoRankPartida({
        jogador1Id: "j1",
        jogador2Id: "j2",
        vitoriasJogador1: 2,
        vitoriasJogador2: 0,
        pontosJogador1: 750,
        pontosJogador2: 1600,
      });

      expect(resultado).not.toBeNull();
      expect(resultado!.vencedorId).toBe("j1");
      expect(resultado!.deltaVencedor).toBeGreaterThan(0);
      expect(resultado!.deltaPerdedor).toBeLessThan(0);
      expect(resultado!.rankPerdedorAntes).toBe("foguete");
      expect(resultado!.rankVencedorAntes).toBe("prata");
    });
  });
});
