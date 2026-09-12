import { coresDoArquetipo, inferirCoresDeNomes, normalizarCores } from "../../../src/helpers/deck/coresDeck";

describe("coresDeck", () => {
  it("normaliza WUBRG e ignora inválidas", () => {
    expect(normalizarCores(["g", "U", "X", "g"])).toEqual(["U", "G"]);
  });

  it("infere só terrenos básicos", () => {
    expect(inferirCoresDeNomes(["Island", "darkslick shores", "thoughtcast"])).toEqual(["U"]);
  });

  it("prioriza cores persistidas no deck", () => {
    expect(coresDoArquetipo(
      [{ cores: ["B", "U"] }, { cores: ["R"] }],
      ["island"],
    )).toEqual(["U", "B", "R"]);
  });
});
