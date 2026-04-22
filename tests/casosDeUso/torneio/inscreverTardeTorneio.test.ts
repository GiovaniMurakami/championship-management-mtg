import { InscreverTardeTorneio } from "../../../src/casosDeUso/torneio/inscreverTardeTorneio";
import {
    criarMockTorneioGateway,
    criarMockInscricaoGateway,
    criarMockPartidaGateway,
    criarMockUsuarioGateway,
} from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("InscreverTardeTorneio", () => {
    const torneio = new Torneio({
        id: "torneio-1",
        nome: "Torneio Teste",
        horario: new Date(),
        formato: "modern",
        donoId: "admin-1",
        status: "em_andamento",
        rodadaAtual: 2,
        totalRodadas: 4,
    });

    const usuario = new Usuario({
        id: "user-new",
        nome: "Novo Jogador",
        email: "new@test.com",
        senha: "hash",
        role: "user",
        nickMTGO: "new_player",
    });

    const input = {
        torneioId: "torneio-1",
        usuarioId: "user-new",
        requisitanteId: "admin-1",
        isAdmin: false,
    };

    it("deve lançar 404 se torneio não existir", async () => {
        const uc = InscreverTardeTorneio.criar(
            criarMockTorneioGateway(),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway()
        );
        await expect(uc.executar(input)).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 400 se torneio não estiver em andamento", async () => {
        const torneioAberto = new Torneio({ ...torneio, status: "inscricoes_abertas" });
        const uc = InscreverTardeTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioAberto) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway()
        );
        await expect(uc.executar(input)).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 403 se não for dono nem admin", async () => {
        const uc = InscreverTardeTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway()
        );
        await expect(uc.executar({ ...input, requisitanteId: "outro", isAdmin: false }))
            .rejects.toMatchObject({ status: 403 });
    });

    it("deve lançar 400 se jogador já estiver inscrito", async () => {
        const inscricaoExistente = { id: "i-1", torneioId: "torneio-1", usuarioId: "user-new" };
        const uc = InscreverTardeTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricaoExistente) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway()
        );
        await expect(uc.executar(input)).rejects.toMatchObject({ status: 400 });
    });

    it("deve criar inscrição e partida bye de penalidade com sucesso", async () => {
        const salvarInscricao = jest.fn();
        const salvarPartida = jest.fn();

        const uc = InscreverTardeTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({
                buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null),
                salvar: salvarInscricao,
            }),
            criarMockPartidaGateway({ salvar: salvarPartida }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) })
        );

        const resultado = await uc.executar(input);

        expect(resultado.usuario.nome).toBe("Novo Jogador");
        expect(resultado.rodada).toBe(2);
        expect(salvarInscricao).toHaveBeenCalledTimes(1);
        expect(salvarPartida).toHaveBeenCalledTimes(1);

        const partidaCriada = salvarPartida.mock.calls[0][0];
        expect(partidaCriada.vitoriasJogador1).toBe(0);
        expect(partidaCriada.vitoriasJogador2).toBe(2);
        expect(partidaCriada.tipoBye).toBe("penalidade");
        expect(partidaCriada.status).toBe("finalizada");
        expect(partidaCriada.jogador2Id).toBeNull();
    });
});
