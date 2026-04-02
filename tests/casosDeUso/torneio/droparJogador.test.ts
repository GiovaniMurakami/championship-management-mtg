import { DroparJogador } from "../../../src/casosDeUso/torneio/droparJogador";
import { criarMockTorneioGateway, criarMockInscricaoGateway, criarMockUsuarioGateway, criarMockPartidaGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { Partida } from "../../../src/dominio/entidade/partida";

describe("DroparJogador", () => {
    const torneio = new Torneio({
        id: "t-1", nome: "T", horario: new Date(), formato: "f",
        donoId: "dono", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
    });

    const inscricao = new Inscricao({
        id: "i-1", torneioId: "t-1", usuarioId: "u-1",
        checkIn: true, checkInRodada: 0, dropped: false,
    });

    const jogador = new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" });

    it("deve dropar o próprio jogador com sucesso", async () => {
        const inscricaoGw = criarMockInscricaoGateway({
            buscarPorTorneioEUsuario: jest.fn().mockResolvedValue({ ...inscricao }),
        });
        const uc = DroparJogador.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            inscricaoGw,
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(jogador) }),
            criarMockPartidaGateway(),
        );

        const resultado = await uc.executar({
            torneioId: "t-1", requisitanteId: "u-1", isAdmin: false, jogadorId: "u-1",
        });

        expect(resultado.dropped).toBe(true);
        expect(resultado.jogador).toEqual({ id: "u-1", nome: "João" });
        expect(inscricaoGw.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve permitir que o dono do torneio drope um jogador", async () => {
        const uc = DroparJogador.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue({ ...inscricao }) }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(jogador) }),
            criarMockPartidaGateway(),
        );

        const resultado = await uc.executar({
            torneioId: "t-1", requisitanteId: "dono", isAdmin: false, jogadorId: "u-1",
        });

        expect(resultado.dropped).toBe(true);
        expect(resultado.jogador.id).toBe("u-1");
    });

    it("deve lançar erro se não for o próprio jogador, nem dono, nem admin", async () => {
        const uc = DroparJogador.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway(),
            criarMockUsuarioGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", requisitanteId: "outro", isAdmin: false, jogadorId: "u-1" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode dropar qualquer jogador de qualquer torneio", async () => {
        const inscricaoGw = criarMockInscricaoGateway({
            buscarPorTorneioEUsuario: jest.fn().mockResolvedValue({ ...inscricao }),
        });
        const uc = DroparJogador.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            inscricaoGw,
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(jogador) }),
            criarMockPartidaGateway(),
        );

        const resultado = await uc.executar({
            torneioId: "t-1", requisitanteId: "admin-id", isAdmin: true, jogadorId: "u-1",
        });

        expect(resultado.dropped).toBe(true);
        expect(inscricaoGw.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se torneio finalizado", async () => {
        const torneioFinalizado = { ...torneio, status: "finalizado" as const };
        const uc = DroparJogador.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioFinalizado) }),
            criarMockInscricaoGateway(),
            criarMockUsuarioGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", requisitanteId: "u-1", isAdmin: false, jogadorId: "u-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se jogador não estiver inscrito", async () => {
        const uc = DroparJogador.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway(),
            criarMockUsuarioGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", requisitanteId: "u-1", isAdmin: false, jogadorId: "u-1" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se jogador já foi dropado", async () => {
        const inscricaoJaDropada = { ...inscricao, dropped: true };
        const uc = DroparJogador.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricaoJaDropada) }),
            criarMockUsuarioGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", requisitanteId: "u-1", isAdmin: false, jogadorId: "u-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 404 se torneio não encontrado", async () => {
        const uc = DroparJogador.criar(
            criarMockTorneioGateway(), // retorna null por padrão
            criarMockInscricaoGateway(),
            criarMockUsuarioGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ torneioId: "inexistente", requisitanteId: "u-1", isAdmin: false, jogadorId: "u-1" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve resolver partidas pendentes (bye, jogador1 e jogador2) ao dropar em torneio em andamento", async () => {
        const partidaBye = new Partida({
            id: "p-bye", torneioId: "t-1", rodada: 1,
            jogador1Id: "u-1", jogador2Id: null,
            vitoriasJogador1: 0, vitoriasJogador2: 0, status: "pendente",
        });
        const partidaComoJogador1 = new Partida({
            id: "p-j1", torneioId: "t-1", rodada: 1,
            jogador1Id: "u-1", jogador2Id: "u-2",
            vitoriasJogador1: 0, vitoriasJogador2: 0, status: "pendente",
        });
        const partidaComoJogador2 = new Partida({
            id: "p-j2", torneioId: "t-1", rodada: 1,
            jogador1Id: "u-3", jogador2Id: "u-1",
            vitoriasJogador1: 0, vitoriasJogador2: 0, status: "pendente",
        });

        const inscricaoGw = criarMockInscricaoGateway({
            buscarPorTorneioEUsuario: jest.fn().mockResolvedValue({ ...inscricao }),
        });
        const partidaGw = criarMockPartidaGateway({
            listarPorTorneio: jest.fn().mockResolvedValue([partidaBye, partidaComoJogador1, partidaComoJogador2]),
        });
        const uc = DroparJogador.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            inscricaoGw,
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(jogador) }),
            partidaGw,
        );

        const resultado = await uc.executar({
            torneioId: "t-1", requisitanteId: "u-1", isAdmin: false, jogadorId: "u-1",
        });

        expect(resultado.dropped).toBe(true);
        expect(partidaGw.atualizar).toHaveBeenCalledTimes(3);
    });
});
