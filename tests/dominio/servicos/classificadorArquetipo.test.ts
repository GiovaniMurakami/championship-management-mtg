import { Deck, Carta } from "../../../src/dominio/entidade/deck";
import { classificarArquetipo } from "../../../src/dominio/servicos/classificadorArquetipo";

const base: Carta[] = [
  { nome: "Tolarian Terror", quantidade: 4 },
  { nome: "Cryptic Serpent", quantidade: 4 },
  { nome: "Brainstorm", quantidade: 4 },
  { nome: "Counterspell", quantidade: 4 },
  { nome: "Mental Note", quantidade: 4 },
  { nome: "Thought Scour", quantidade: 4 },
  { nome: "Lorien Revealed", quantidade: 4 },
  { nome: "Snuff Out", quantidade: 4 },
  { nome: "Island", quantidade: 28 },
];

function referencia(nome: string, nomeConsolidado: string, maindeck: Carta[] = base): Deck {
  return new Deck({
    id: nome,
    nome,
    nomeConsolidado,
    formato: "pauper",
    maindeck,
    sideboard: [],
    commander: [],
    usuarioId: "usuario-referencia",
  });
}

describe("classificarArquetipo", () => {
  it("classifica uma lista muito parecida com uma referencia curada", () => {
    const resultado = classificarArquetipo(
      { maindeck: base, sideboard: [], commander: [] },
      [referencia("Lista do campeonato", "Mono-Blue Terror")],
    );

    expect(resultado.nomeConsolidado).toBe("Mono-Blue Terror");
    expect(resultado.confianca).toBe(1);
    expect(resultado.cartasRelevantesEmComum).toBe(8);
  });

  it("nao usa como referencia um nome que nunca foi consolidado", () => {
    const resultado = classificarArquetipo(
      { maindeck: base, sideboard: [], commander: [] },
      [referencia("Minha lista", "Minha lista")],
    );

    expect(resultado.nomeConsolidado).toBeNull();
  });

  it("nao classifica quando dois arquetipos tem a mesma similaridade", () => {
    const resultado = classificarArquetipo(
      { maindeck: base, sideboard: [], commander: [] },
      [
        referencia("Lista A", "Mono-Blue Terror"),
        referencia("Lista B", "Dimir Terror"),
      ],
    );

    expect(resultado.nomeConsolidado).toBeNull();
    expect(resultado.confianca).toBe(resultado.segundaConfianca);
  });

  it("ignora terrenos basicos ao medir a confianca", () => {
    const alvo = [{ nome: "Island", quantidade: 60 }];
    const resultado = classificarArquetipo(
      { maindeck: alvo, sideboard: [], commander: [] },
      [referencia("Lista azul", "Mono-Blue", alvo)],
    );

    expect(resultado.nomeConsolidado).toBeNull();
    expect(resultado.confianca).toBe(0);
  });
});
