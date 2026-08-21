import { montarFiltroListagemUsuarios } from "../../../src/helpers/usuario/filtroListagemUsuarios";

describe("montarFiltroListagemUsuarios", () => {
  it("por padrão exclui só excluido=true (inclui docs sem o campo)", () => {
    expect(montarFiltroListagemUsuarios({})).toEqual({
      excluido: { $ne: true },
    });
  });

  it("lista apenas excluídos quando pedido", () => {
    expect(montarFiltroListagemUsuarios({ excluido: true })).toEqual({
      excluido: true,
    });
  });

  it("trata excluido=false como $ne true", () => {
    expect(montarFiltroListagemUsuarios({ excluido: false })).toEqual({
      excluido: { $ne: true },
    });
  });

  it("trata bloqueadoTorneios=false como $ne true", () => {
    expect(montarFiltroListagemUsuarios({ bloqueadoTorneios: false })).toEqual({
      excluido: { $ne: true },
      bloqueadoTorneios: { $ne: true },
    });
  });

  it("filtra por nome, nicks e email escapando regex", () => {
    const filtro = montarFiltroListagemUsuarios({ nome: "a+b" });
    expect(filtro.$or).toEqual([
      { nome: { $regex: "a\\+b", $options: "i" } },
      { nickMTGO: { $regex: "a\\+b", $options: "i" } },
      { nickArena: { $regex: "a\\+b", $options: "i" } },
      { email: { $regex: "a\\+b", $options: "i" } },
    ]);
  });
});
