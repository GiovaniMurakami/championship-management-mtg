import { describe, expect, it } from "vitest";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import {
  calcularDestaquesDay2,
  obterPrimeiraRodadaCorte,
} from "../../../src/casosDeUso/metagame/destaquesDay2";

describe("destaquesDay2", () => {
  it("calcula primeira rodada do corte", () => {
    expect(obterPrimeiraRodadaCorte(8, 16)).toBe(14);
    expect(obterPrimeiraRodadaCorte(4, 10)).toBe(9);
    expect(obterPrimeiraRodadaCorte(undefined, 16)).toBeNull();
  });

  it("monta meta, desempenho Swiss Day 2 e caminho do corte", () => {
    const alice = new Usuario({ id: "u1", nome: "Alice", email: "a@a.com", senha: "x", role: "user" });
    const bob = new Usuario({ id: "u2", nome: "Bob", email: "b@b.com", senha: "x", role: "user" });
    const carol = new Usuario({ id: "u3", nome: "Carol", email: "c@c.com", senha: "x", role: "user" });
    const dan = new Usuario({ id: "u4", nome: "Dan", email: "d@d.com", senha: "x", role: "user" });

    const terror = new Deck({
      id: "d1",
      nome: "Terror",
      nomeConsolidado: "Tolarian Terror",
      usuarioId: "u1",
      formato: "pauper",
      maindeck: [],
      sideboard: [],
    });
    const bogles = new Deck({
      id: "d2",
      nome: "Bogles",
      usuarioId: "u2",
      formato: "pauper",
      maindeck: [],
      sideboard: [],
    });
    const affinity = new Deck({
      id: "d3",
      nome: "Affinity",
      usuarioId: "u3",
      formato: "pauper",
      maindeck: [],
      sideboard: [],
    });
    const gardens = new Deck({
      id: "d4",
      nome: "Gardens",
      usuarioId: "u4",
      formato: "pauper",
      maindeck: [],
      sideboard: [],
    });

    const inscricoes = [
      new Inscricao({ id: "i1", torneioId: "t1", usuarioId: "u1", deckId: "d1", checkInRodada: 1, dropped: false }),
      new Inscricao({ id: "i2", torneioId: "t1", usuarioId: "u2", deckId: "d2", checkInRodada: 1, dropped: false }),
      new Inscricao({ id: "i3", torneioId: "t1", usuarioId: "u3", deckId: "d3", checkInRodada: 1, dropped: false }),
      new Inscricao({ id: "i4", torneioId: "t1", usuarioId: "u4", deckId: "d4", checkInRodada: 1, dropped: false }),
      new Inscricao({
        id: "i5",
        torneioId: "t1",
        usuarioId: "u5",
        deckId: "d1",
        checkInRodada: 1,
        dropped: true,
        droppedRodada: 2,
      }),
    ];

    const partidas = [
      // Day 1 — ignorada no desempenho Day 2
      new Partida({
        id: "p0",
        torneioId: "t1",
        rodada: 2,
        mesa: 1,
        jogador1Id: "u1",
        jogador2Id: "u2",
        deckJogador1Id: "d1",
        deckJogador2Id: "d2",
        vitoriasJogador1: 2,
        vitoriasJogador2: 0,
        status: "finalizada",
      }),
      // Day 2 Swiss
      new Partida({
        id: "p1",
        torneioId: "t1",
        rodada: 3,
        mesa: 1,
        jogador1Id: "u1",
        jogador2Id: "u2",
        deckJogador1Id: "d1",
        deckJogador2Id: "d2",
        vitoriasJogador1: 2,
        vitoriasJogador2: 0,
        status: "finalizada",
      }),
      new Partida({
        id: "p2",
        torneioId: "t1",
        rodada: 3,
        mesa: 2,
        jogador1Id: "u3",
        jogador2Id: "u4",
        deckJogador1Id: "d3",
        deckJogador2Id: "d4",
        vitoriasJogador1: 2,
        vitoriasJogador2: 1,
        status: "finalizada",
      }),
      // Corte: Bob (menos wins no Day2 swiss) vence Alice → upset
      new Partida({
        id: "p3",
        torneioId: "t1",
        rodada: 4,
        mesa: 1,
        jogador1Id: "u2",
        jogador2Id: "u1",
        deckJogador1Id: "d2",
        deckJogador2Id: "d1",
        vitoriasJogador1: 2,
        vitoriasJogador2: 0,
        status: "finalizada",
      }),
    ];

    const decksPorId = new Map([
      ["d1", terror],
      ["d2", bogles],
      ["d3", affinity],
      ["d4", gardens],
    ]);
    const usuariosPorId = new Map([
      ["u1", alice],
      ["u2", bob],
      ["u3", carol],
      ["u4", dan],
    ]);

    const destaques = calcularDestaquesDay2({
      rodadasDay1: 2,
      corteTop: 4,
      totalRodadas: 5,
      inscricoes,
      partidas,
      decksPorId,
      usuariosPorId,
    });

    expect(destaques).toBeDefined();
    expect(destaques!.jogadores).toBe(4);
    expect(destaques!.arquetipos).toBe(4);
    expect(destaques!.meta[0].copias).toBeGreaterThanOrEqual(1);
    expect(destaques!.melhorDesempenho[0]).toMatchObject({
      nome: "Alice",
      vitorias: 1,
      derrotas: 0,
    });
    expect(destaques!.corte).toHaveLength(1);
    expect(destaques!.corte[0]).toMatchObject({
      rodada: 4,
      vencedor: "Bob",
      upset: true,
      placar: "2-0",
    });
    expect(destaques!.resumo.partidas).toBe(3);
    expect(destaques!.resumo.varreduras2a0).toBe(2);
  });
});
