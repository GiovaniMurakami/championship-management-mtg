import { BuscarMeuUsuario } from "../../../src/casosDeUso/usuario/buscarMeuUsuario";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { criarMockUsuarioGateway } from "../../mocks/gateways";

describe("BuscarMeuUsuario", () => {
  it("retorna perfil autenticado incluindo newsletterMetagame", async () => {
    const usuario = new Usuario({
      id: "user-1",
      nome: "Giovani",
      email: "giovani@email.com",
      senha: "hash",
      telefone: "11999",
      nickMTGO: "gio",
      nickArena: "gio#1",
      role: "admin",
      newsletterMetagame: false,
      criadoEm: new Date("2026-01-02T00:00:00.000Z"),
    });
    const gateway = criarMockUsuarioGateway({
      buscarPorId: vi.fn().mockResolvedValue(usuario),
    });
    const uc = BuscarMeuUsuario.criar(gateway);

    const resultado = await uc.executar({ id: "user-1" });

    expect(resultado).toMatchObject({
      id: "user-1",
      nome: "Giovani",
      email: "giovani@email.com",
      newsletterMetagame: false,
      role: "admin",
    });
  });

  it("lança 404 se usuário não existir ou estiver excluído", async () => {
    const uc = BuscarMeuUsuario.criar(criarMockUsuarioGateway());
    await expect(uc.executar({ id: "x" })).rejects.toMatchObject({ status: 404 });

    const excluido = new Usuario({
      id: "user-1",
      nome: "X",
      email: "x@e.com",
      senha: "h",
      excluido: true,
    });
    const uc2 = BuscarMeuUsuario.criar(criarMockUsuarioGateway({
      buscarPorId: vi.fn().mockResolvedValue(excluido),
    }));
    await expect(uc2.executar({ id: "user-1" })).rejects.toMatchObject({ status: 404 });
  });
});
