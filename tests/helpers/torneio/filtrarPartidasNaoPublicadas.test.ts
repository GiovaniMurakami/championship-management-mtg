import {
  aplicarPublicacaoRodada,
  filtrarPartidasNaoPublicadas,
  rodadaEstaPublicada,
} from "../../../src/helpers/torneio/filtrarPartidasNaoPublicadas";
import { Torneio } from "../../../src/dominio/entidade/torneio";

describe("filtrarPartidasNaoPublicadas", () => {
  const torneio = new Torneio({
    id: "t-1",
    nome: "T",
    horario: new Date(),
    formato: "legacy",
    donoId: "d",
    status: "em_andamento",
    rodadaAtual: 2,
    totalRodadas: 4,
    rodadaPublicada: false,
  });
  const partidas = [
    { id: "p1", rodada: 1 },
    { id: "p2", rodada: 2 },
  ];

  it("esconde a rodada atual para quem não gerencia", () => {
    expect(filtrarPartidasNaoPublicadas(partidas, torneio, false).map((p) => p.id)).toEqual(["p1"]);
  });

  it("mostra rascunho para organizador", () => {
    expect(filtrarPartidasNaoPublicadas(partidas, torneio, true)).toHaveLength(2);
  });

  it("documentos antigos sem o campo são tratados como publicados", () => {
    expect(rodadaEstaPublicada({} as Torneio)).toBe(true);
  });

  it("aplicarPublicacaoRodada limpa o relógio quando não publica", () => {
    const t = new Torneio({
      id: "t-1", nome: "T", horario: new Date(), formato: "legacy", donoId: "d",
      status: "em_andamento", rodadaAtual: 1, totalRodadas: 3, rodadaIniciadaEm: new Date(),
    });
    aplicarPublicacaoRodada(t, false);
    expect(t.rodadaPublicada).toBe(false);
    expect(t.rodadaIniciadaEm).toBeUndefined();
  });
});
