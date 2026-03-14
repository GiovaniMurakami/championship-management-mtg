import { IniciarTorneio } from "../../../src/casosDeUso/torneio/iniciarTorneio";
import { criarMockTorneioGateway, criarMockInscricaoGateway, criarMockPartidaGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";

describe("IniciarTorneio", () => {
    const torneioAberto = new Torneio({
        id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
        donoId: "dono-1", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
    });

    const inscricoesComCheckIn = [
        new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkIn: true, checkInRodada: 0, dropped: false }),
        new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkIn: true, checkInRodada: 0, dropped: false }),
        new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkIn: true, checkInRodada: 0, dropped: false }),
        new Inscricao({ id: "i4", torneioId: "t-1", usuarioId: "u-4", checkIn: true, checkInRodada: 0, dropped: false }),
    ];

    it("deve iniciar o torneio e criar as partidas da rodada 1", async () => {
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...torneioAberto }),
        });
        const inscricaoGw = criarMockInscricaoGateway({
            listarPorTorneio: jest.fn().mockResolvedValue(inscricoesComCheckIn),
        });
        const partidaGw = criarMockPartidaGateway();

        const uc = IniciarTorneio.criar(torneioGw, inscricaoGw, partidaGw);

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono-1" });

        expect(resultado.torneioId).toBe("t-1");
        expect(resultado.rodadaAtual).toBe(1);
        expect(resultado.totalRodadas).toBe(2); // ceil(log2(4)) = 2
        expect(resultado.partidas).toHaveLength(2);
        expect(torneioGw.atualizar).toHaveBeenCalledTimes(1);
        expect(partidaGw.salvarVarias).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se o torneio não for encontrado", async () => {
        const uc = IniciarTorneio.criar(
            criarMockTorneioGateway(),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ torneioId: "inexistente", donoId: "d" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se não for o dono do torneio", async () => {
        const uc = IniciarTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue({ ...torneioAberto }) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "outro" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("deve lançar erro se o torneio já foi iniciado", async () => {
        const torneioEmAndamento = { ...torneioAberto, status: "em_andamento" as const };
        const uc = IniciarTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se houver menos de 2 jogadores com check-in", async () => {
        const apenasUm = [inscricoesComCheckIn[0]];
        const uc = IniciarTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue({ ...torneioAberto }) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(apenasUm) }),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve gerar bye quando número ímpar de jogadores", async () => {
        const tresJogadores = inscricoesComCheckIn.slice(0, 3);
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...torneioAberto }),
        });
        const uc = IniciarTorneio.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(tresJogadores) }),
            criarMockPartidaGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono-1" });

        expect(resultado.partidas).toHaveLength(2);
        const byes = resultado.partidas.filter((p) => p.jogador2Id === null);
        expect(byes).toHaveLength(1);
    });
});
