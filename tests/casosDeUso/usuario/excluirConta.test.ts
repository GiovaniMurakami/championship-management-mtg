import { ExcluirConta } from "../../../src/casosDeUso/usuario/excluirConta";
import {
  criarMockLoginAttemptGateway,
  criarMockRefreshTokenGateway,
  criarMockResetSenhaGateway,
  criarMockTimeGateway,
  criarMockTorneioGateway,
  criarMockUsuarioGateway,
} from "../../mocks/gateways";
import { Time } from "../../../src/dominio/entidade/time";
import { Usuario } from "../../../src/dominio/entidade/usuario";

function criarUc(overrides: {
  usuario?: Usuario | null;
  times?: Time[];
  torneiosComoDono?: number;
} = {}) {
  const usuario =
    overrides.usuario === undefined
      ? new Usuario({
          id: "u-1",
          nome: "Jogador Teste",
          email: "j@e.com",
          senha: "hash",
          nickMTGO: "nick",
          telefone: "11999999999",
        })
      : overrides.usuario;

  const usuarioGateway = criarMockUsuarioGateway({
    buscarPorId: jest.fn().mockResolvedValue(usuario),
    atualizar: jest.fn().mockImplementation(async (u: Usuario) => u),
  });
  const torneioGateway = criarMockTorneioGateway({
    contarPorDono: jest.fn().mockResolvedValue(overrides.torneiosComoDono ?? 0),
    removerAnfitriaoDoUsuario: jest.fn().mockResolvedValue(0),
  });
  const timeGateway = criarMockTimeGateway({
    buscarPorMembros: jest.fn().mockResolvedValue(overrides.times ?? []),
  });
  const refreshTokenGateway = criarMockRefreshTokenGateway({
    excluirPorUsuario: jest.fn(),
  });
  const resetSenhaGateway = criarMockResetSenhaGateway({
    excluirPorUsuario: jest.fn(),
  });
  const loginAttemptGateway = criarMockLoginAttemptGateway({
    resetar: jest.fn(),
  });

  const uc = ExcluirConta.criar(
    usuarioGateway,
    torneioGateway,
    timeGateway,
    refreshTokenGateway,
    resetSenhaGateway,
    loginAttemptGateway,
  );

  return {
    uc,
    usuario,
    usuarioGateway,
    torneioGateway,
    timeGateway,
    refreshTokenGateway,
    resetSenhaGateway,
    loginAttemptGateway,
  };
}

describe("ExcluirConta", () => {
  it("anonimiza a conta e preserva identidade sem excluir o registro", async () => {
    const { uc, usuario, usuarioGateway, torneioGateway, refreshTokenGateway, loginAttemptGateway } =
      criarUc();

    const resultado = await uc.executar({ usuarioId: "u-1", confirmacao: "Jogador Teste" });

    expect(resultado.id).toBe("u-1");
    expect(resultado.mensagem).toMatch(/preservados/i);
    expect(torneioGateway.removerAnfitriaoDoUsuario).toHaveBeenCalledWith("u-1");
    expect(refreshTokenGateway.excluirPorUsuario).toHaveBeenCalledWith("u-1");
    expect(loginAttemptGateway.resetar).toHaveBeenCalledWith("j@e.com");
    expect(usuarioGateway.atualizar).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "u-1",
        nome: "Usuário excluído",
        email: "excluido+u-1@excluido.local",
        excluido: true,
        bloqueadoTorneios: true,
        telefone: undefined,
        nickMTGO: undefined,
      }),
    );
    expect(usuario.excluido).toBe(true);
    expect(usuarioGateway.excluir).not.toHaveBeenCalled();
  });

  it("rejeita confirmacao incorreta", async () => {
    const { uc } = criarUc();
    await expect(
      uc.executar({ usuarioId: "u-1", confirmacao: "outro nome" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("nao permite excluir admin", async () => {
    const { uc } = criarUc({
      usuario: new Usuario({
        id: "admin-1",
        nome: "Admin",
        email: "a@e.com",
        senha: "hash",
        role: "admin",
      }),
    });

    await expect(
      uc.executar({ usuarioId: "admin-1", confirmacao: "Admin" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("bloqueia se for dono de time", async () => {
    const { uc } = criarUc({
      times: [
        new Time({
          id: "t-1",
          nome: "Time",
          donoId: "u-1",
          membroIds: ["u-1"],
        }),
      ],
    });

    await expect(
      uc.executar({ usuarioId: "u-1", confirmacao: "Jogador Teste" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("bloqueia se for dono de torneio", async () => {
    const { uc } = criarUc({ torneiosComoDono: 2 });

    await expect(
      uc.executar({ usuarioId: "u-1", confirmacao: "Jogador Teste" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejeita conta ja excluida", async () => {
    const { uc } = criarUc({
      usuario: new Usuario({
        id: "u-1",
        nome: "Usuário excluído",
        email: "excluido+u-1@excluido.local",
        senha: "hash",
        excluido: true,
      }),
    });

    await expect(
      uc.executar({ usuarioId: "u-1", confirmacao: "Usuário excluído" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
