import { ListarRankingUsuarios } from "../../../src/casosDeUso/rank/listarRankingUsuarios";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { criarMockUsuarioGateway } from "../../mocks/gateways";

describe("ListarRankingUsuarios", () => {
  const usuarios = [
    new Usuario({ id: "u-1", nome: "João Silva", email: "a@a.com", senha: "s", pontosRank: 1200 }),
    new Usuario({ id: "u-2", nome: "Maria Santos", email: "b@b.com", senha: "s", pontosRank: 800 }),
  ];

  it("lista ranking paginado sem filtro", async () => {
    const usuarioGw = criarMockUsuarioGateway({
      listarRanking: jest.fn().mockResolvedValue({ usuarios, total: 2 }),
    });
    const uc = ListarRankingUsuarios.criar(usuarioGw);

    const resultado = await uc.executar({ limite: 10, offset: 0 });

    expect(usuarioGw.listarRanking).toHaveBeenCalledWith(10, 0, undefined);
    expect(resultado.total).toBe(2);
    expect(resultado.ranking[0].rank).toBe("ouro");
  });

  it("repassa filtro por nome ao gateway", async () => {
    const usuarioGw = criarMockUsuarioGateway({
      listarRanking: jest.fn().mockResolvedValue({ usuarios: [usuarios[0]], total: 1 }),
    });
    const uc = ListarRankingUsuarios.criar(usuarioGw);

    const resultado = await uc.executar({ nome: "joão", limite: 20, offset: 0 });

    expect(usuarioGw.listarRanking).toHaveBeenCalledWith(20, 0, "joão");
    expect(resultado.ranking).toHaveLength(1);
    expect(resultado.ranking[0].nome).toBe("João Silva");
  });
});
