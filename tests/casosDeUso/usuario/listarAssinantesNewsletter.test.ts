import { ListarAssinantesNewsletter } from "../../../src/casosDeUso/usuario/listarAssinantesNewsletter";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { criarMockUsuarioGateway } from "../../mocks/gateways";

describe("ListarAssinantesNewsletter", () => {
  it("lista apenas assinantes com newsletter ativa e pagina", async () => {
    const assinante = new Usuario({
      id: "a1",
      nome: "Ana",
      email: "ana@email.com",
      senha: "hash",
      newsletterMetagame: true,
      criadoEm: new Date("2026-01-01T00:00:00.000Z"),
    });
    const gateway = criarMockUsuarioGateway({
      listar: vi.fn().mockResolvedValue([assinante]),
      listarTotal: vi.fn().mockResolvedValue(1),
    });
    const uc = ListarAssinantesNewsletter.criar(gateway);

    const resultado = await uc.executar({ limite: 10, offset: 0, nome: "Ana" });

    expect(gateway.listar).toHaveBeenCalledWith({
      nome: "Ana",
      excluido: false,
      newsletterMetagame: true,
      limite: 10,
      offset: 0,
    });
    expect(gateway.listarTotal).toHaveBeenCalledWith({
      nome: "Ana",
      newsletterMetagame: true,
    });
    expect(resultado).toEqual({
      assinantes: [{
        id: "a1",
        nome: "Ana",
        email: "ana@email.com",
        role: "user",
        criadoEm: "2026-01-01T00:00:00.000Z",
      }],
      total: 1,
      limite: 10,
      offset: 0,
    });
  });
});
