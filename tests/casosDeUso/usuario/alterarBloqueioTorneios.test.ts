import { AlterarBloqueioTorneios } from "../../../src/casosDeUso/usuario/alterarBloqueioTorneios";
import {
  criarMockInscricaoGateway,
  criarMockTorneioGateway,
  criarMockUsuarioGateway,
} from "../../mocks/gateways";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { eventosTorneio } from "../../../src/infra/socketio/eventosTorneio";

jest.mock("../../../src/infra/socketio/eventosTorneio", () => ({
  eventosTorneio: { emit: jest.fn() },
}));

describe("AlterarBloqueioTorneios", () => {
  const usuario = new Usuario({
    id: "u-1",
    nome: "Jogador",
    email: "j@e.com",
    senha: "hash",
    nickMTGO: "jogador",
  });

  it("deve bloquear e remover inscricoes de torneios abertos", async () => {
    const inscricoes = [
      new Inscricao({ id: "i-1", torneioId: "t-aberto", usuarioId: "u-1", checkInRodada: -1, dropped: false }),
      new Inscricao({ id: "i-2", torneioId: "t-andamento", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
    ];
    const inscricaoGateway = criarMockInscricaoGateway({
      listarPorUsuario: jest.fn().mockResolvedValue(inscricoes),
      excluir: jest.fn(),
    });
    const torneioGateway = criarMockTorneioGateway({
      buscarPorId: jest.fn().mockImplementation(async (id: string) => {
        if (id === "t-aberto") {
          return new Torneio({
            id: "t-aberto",
            nome: "Aberto",
            horario: new Date(),
            formato: "legacy",
            donoId: "dono",
            status: "inscricoes_abertas",
            rodadaAtual: 0,
            totalRodadas: 0,
          });
        }
        return new Torneio({
          id: "t-andamento",
          nome: "Andamento",
          horario: new Date(),
          formato: "legacy",
          donoId: "dono",
          status: "em_andamento",
          rodadaAtual: 1,
          totalRodadas: 3,
        });
      }),
    });
    const usuarioGateway = criarMockUsuarioGateway({
      buscarPorId: jest.fn().mockResolvedValue(usuario),
      atualizar: jest.fn(),
    });

    const uc = AlterarBloqueioTorneios.criar(usuarioGateway, inscricaoGateway, torneioGateway);
    const resultado = await uc.executar({ usuarioId: "u-1", bloqueado: true });

    expect(resultado.bloqueadoTorneios).toBe(true);
    expect(resultado.inscricoesRemovidas).toBe(1);
    expect(inscricaoGateway.excluir).toHaveBeenCalledWith("i-1");
    expect(inscricaoGateway.excluir).not.toHaveBeenCalledWith("i-2");
    expect(usuarioGateway.atualizar).toHaveBeenCalledTimes(1);
    expect(eventosTorneio.emit).toHaveBeenCalledWith(
      "jogador_dropou",
      expect.objectContaining({
        torneioId: "t-aberto",
        jogadorId: "u-1",
        inscricaoRemovida: true,
      }),
    );
  });

  it("deve desbloquear sem remover inscricoes", async () => {
    const usuarioBloqueado = new Usuario({
      ...usuario,
      bloqueadoTorneios: true,
    });
    const inscricaoGateway = criarMockInscricaoGateway();
    const torneioGateway = criarMockTorneioGateway();
    const usuarioGateway = criarMockUsuarioGateway({
      buscarPorId: jest.fn().mockResolvedValue(usuarioBloqueado),
      atualizar: jest.fn(),
    });

    const uc = AlterarBloqueioTorneios.criar(usuarioGateway, inscricaoGateway, torneioGateway);
    const resultado = await uc.executar({ usuarioId: "u-1", bloqueado: false });

    expect(resultado.bloqueadoTorneios).toBe(false);
    expect(resultado.inscricoesRemovidas).toBe(0);
    expect(inscricaoGateway.listarPorUsuario).not.toHaveBeenCalled();
  });

  it("nao deve permitir bloquear administrador", async () => {
    const admin = new Usuario({
      id: "admin-1",
      nome: "Admin",
      email: "a@e.com",
      senha: "hash",
      role: "admin",
    });
    const uc = AlterarBloqueioTorneios.criar(
      criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(admin) }),
      criarMockInscricaoGateway(),
      criarMockTorneioGateway(),
    );

    await expect(
      uc.executar({ usuarioId: "admin-1", bloqueado: true }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("deve lancar 404 se usuario nao existir", async () => {
    const uc = AlterarBloqueioTorneios.criar(
      criarMockUsuarioGateway(),
      criarMockInscricaoGateway(),
      criarMockTorneioGateway(),
    );

    await expect(
      uc.executar({ usuarioId: "inexistente", bloqueado: true }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
