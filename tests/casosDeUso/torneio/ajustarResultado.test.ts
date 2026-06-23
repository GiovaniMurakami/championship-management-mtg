import { AjustarResultado } from "../../../src/casosDeUso/torneio/ajustarResultado";
import { criarMockPartidaGateway, criarMockTorneioGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("AjustarResultado", () => {
    const usuarioGw = criarMockUsuarioGateway({
        buscarVarios: jest.fn().mockResolvedValue([
            new Usuario({ id: "u-1", nome: "U1", email: "a@a.com", senha: "s" }),
            new Usuario({ id: "u-2", nome: "U2", email: "b@b.com", senha: "s" }),
        ]),
    });

    const torneio = new Torneio({
        id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
        donoId: "dono-1", status: "em_andamento", rodadaAtual: 2, totalRodadas: 4,
    });

    function criarUc(partidaGw = criarMockPartidaGateway(), torneioRef: Torneio | null = torneio) {
        return AjustarResultado.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioRef) }),
            partidaGw,
            usuarioGw,
        );
    }

    const partidaContestada = new Partida({
        id: "p-1", torneioId: "t-1", rodada: 1,
        jogador1Id: "u-1", jogador2Id: "u-2",
        vitoriasJogador1: 2, vitoriasJogador2: 0,
        status: "finalizada", contestado: true,
    });

    it("deve ajustar o resultado de uma partida contestada", async () => {
        const partidaAjustada = new Partida({ ...partidaContestada, vitoriasJogador1: 1, vitoriasJogador2: 2, contestado: false });

        const uc = criarUc(
            criarMockPartidaGateway({
                buscarPorId: jest.fn().mockResolvedValue(partidaContestada),
                ajustarResultadoContestado: jest.fn().mockResolvedValue(partidaAjustada),
            }),
        );

        const resultado = await uc.executar({
            partidaId: "p-1", requisitanteId: "dono-1", isAdmin: false,
            vitoriasJogador1: 1, vitoriasJogador2: 2,
        });

        expect(resultado.vitoriasJogador1).toBe(1);
        expect(resultado.vitoriasJogador2).toBe(2);
        expect(resultado.contestado).toBe(false);
    });

    it("deve lançar 404 se a partida não existir", async () => {
        const uc = criarUc(criarMockPartidaGateway(), null);

        await expect(
            uc.executar({ partidaId: "x", requisitanteId: "dono-1", isAdmin: false, vitoriasJogador1: 2, vitoriasJogador2: 0 })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 400 se a partida não estiver contestada", async () => {
        const partidaNaoContestada = new Partida({ ...partidaContestada, contestado: false });

        const uc = criarUc(
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaNaoContestada) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", requisitanteId: "dono-1", isAdmin: false, vitoriasJogador1: 2, vitoriasJogador2: 0 })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se o torneio não estiver em andamento", async () => {
        const torneioFinalizado = new Torneio({ ...torneio, status: "finalizado" });

        const uc = criarUc(
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaContestada) }),
            torneioFinalizado,
        );

        await expect(
            uc.executar({ partidaId: "p-1", requisitanteId: "dono-1", isAdmin: false, vitoriasJogador1: 2, vitoriasJogador2: 0 })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 403 se não for dono nem admin", async () => {
        const uc = criarUc(
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaContestada) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", requisitanteId: "outro", isAdmin: false, vitoriasJogador1: 2, vitoriasJogador2: 0 })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode ajustar resultado de torneio que não é seu", async () => {
        const partidaAjustada = new Partida({ ...partidaContestada, vitoriasJogador1: 2, vitoriasJogador2: 1, contestado: false });

        const uc = criarUc(
            criarMockPartidaGateway({
                buscarPorId: jest.fn().mockResolvedValue(partidaContestada),
                ajustarResultadoContestado: jest.fn().mockResolvedValue(partidaAjustada),
            }),
        );

        const resultado = await uc.executar({
            partidaId: "p-1", requisitanteId: "algum-admin", isAdmin: true,
            vitoriasJogador1: 2, vitoriasJogador2: 1,
        });

        expect(resultado.vitoriasJogador1).toBe(2);
    });

    it("deve lançar 400 para placar inválido (v1 > 2)", async () => {
        const uc = criarUc(
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaContestada) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", requisitanteId: "dono-1", isAdmin: false, vitoriasJogador1: 3, vitoriasJogador2: 0 })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 para placar inválido (soma > 3)", async () => {
        const uc = criarUc(
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaContestada) }),
        );

        await expect(
            uc.executar({ partidaId: "p-1", requisitanteId: "dono-1", isAdmin: false, vitoriasJogador1: 2, vitoriasJogador2: 2 })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 para empate em fase de corte", async () => {
        const torneioEmCorte = new Torneio({ ...torneio, emCorte: true });

        const uc = criarUc(
            criarMockPartidaGateway({ buscarPorId: jest.fn().mockResolvedValue(partidaContestada) }),
            torneioEmCorte,
        );

        await expect(
            uc.executar({ partidaId: "p-1", requisitanteId: "dono-1", isAdmin: false, vitoriasJogador1: 1, vitoriasJogador2: 1 })
        ).rejects.toMatchObject({ status: 400 });
    });
});
