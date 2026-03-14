import { IniciarProximaRodada } from "../../../src/casosDeUso/torneio/iniciarProximaRodada";
import { criarMockTorneioGateway, criarMockInscricaoGateway, criarMockPartidaGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Partida } from "../../../src/dominio/entidade/partida";

describe("IniciarProximaRodada", () => {
    const torneio = new Torneio({
        id: "t-1", nome: "T", horario: new Date(), formato: "f",
        donoId: "dono", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
    });

    const inscricoes = [
        new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkIn: true, checkInRodada: 1, dropped: false }),
        new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkIn: true, checkInRodada: 1, dropped: false }),
        new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkIn: true, checkInRodada: 1, dropped: false }),
        new Inscricao({ id: "i4", torneioId: "t-1", usuarioId: "u-4", checkIn: true, checkInRodada: 1, dropped: false }),
    ];

    const partidasRodada1 = [
        new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
        new Partida({ id: "p2", torneioId: "t-1", rodada: 1, jogador1Id: "u-3", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
    ];

    it("deve avançar para a próxima rodada criando novas partidas", async () => {
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...torneio }),
        });
        const partidaGw = criarMockPartidaGateway({
            listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada1),
            listarPorTorneio: jest.fn().mockResolvedValue(partidasRodada1),
        });

        const uc = IniciarProximaRodada.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            partidaGw,
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono" });

        expect(resultado.finalizado).toBe(false);
        if (!resultado.finalizado) {
            expect(resultado.rodadaAtual).toBe(2);
            expect(resultado.partidas).toHaveLength(2);
        }
        expect(torneioGw.atualizar).toHaveBeenCalled();
        expect(partidaGw.salvarVarias).toHaveBeenCalled();
    });

    it("deve finalizar o torneio na última rodada", async () => {
        const torneioUltimaRodada = { ...torneio, rodadaAtual: 3, totalRodadas: 3 };
        const inscricoesRodada3 = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkIn: true, checkInRodada: 3, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkIn: true, checkInRodada: 3, dropped: false }),
            new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkIn: true, checkInRodada: 3, dropped: false }),
            new Inscricao({ id: "i4", torneioId: "t-1", usuarioId: "u-4", checkIn: true, checkInRodada: 3, dropped: false }),
        ];
        const todasPartidas = [
            ...partidasRodada1,
            new Partida({ id: "p3", torneioId: "t-1", rodada: 2, jogador1Id: "u-1", jogador2Id: "u-3", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
            new Partida({ id: "p4", torneioId: "t-1", rodada: 2, jogador1Id: "u-2", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
            new Partida({ id: "p5", torneioId: "t-1", rodada: 3, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
            new Partida({ id: "p6", torneioId: "t-1", rodada: 3, jogador1Id: "u-3", jogador2Id: "u-4", vitoriasJogador1: 1, vitoriasJogador2: 2, status: "finalizada" }),
        ];
        const partidasRodadaAtual = todasPartidas.filter((p) => p.rodada === 3);

        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioUltimaRodada),
        });

        const uc = IniciarProximaRodada.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoesRodada3) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodadaAtual),
                listarPorTorneio: jest.fn().mockResolvedValue(todasPartidas),
            }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono" });

        expect(resultado.finalizado).toBe(true);
        if (resultado.finalizado) {
            expect(resultado.classificacao.length).toBeGreaterThan(0);
            expect(resultado.classificacao[0].posicao).toBe(1);
        }
    });

    it("deve lançar erro se houver partidas pendentes", async () => {
        const partidasPendentes = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 0, vitoriasJogador2: 0, status: "pendente" }),
        ];

        const uc = IniciarProximaRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue({ ...torneio }) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway({ listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasPendentes) }),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se não for o dono", async () => {
        const uc = IniciarProximaRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "outro" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("deve lançar erro se o torneio não estiver em andamento", async () => {
        const torneioAberto = { ...torneio, status: "inscricoes_abertas" as const };
        const uc = IniciarProximaRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioAberto) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono" })
        ).rejects.toMatchObject({ status: 400 });
    });
});
