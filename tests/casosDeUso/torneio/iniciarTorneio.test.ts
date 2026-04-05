import { IniciarTorneio } from "../../../src/casosDeUso/torneio/iniciarTorneio";
import { criarMockTorneioGateway, criarMockInscricaoGateway, criarMockPartidaGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { criarMockUsuarioGateway } from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";

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

    const quatroUsuarios = [
        new Usuario({ id: "u-1", nome: "Jogador 1", email: "u1@e.com", senha: "s" }),
        new Usuario({ id: "u-2", nome: "Jogador 2", email: "u2@e.com", senha: "s" }),
        new Usuario({ id: "u-3", nome: "Jogador 3", email: "u3@e.com", senha: "s" }),
        new Usuario({ id: "u-4", nome: "Jogador 4", email: "u4@e.com", senha: "s" }),
    ];

    it("deve iniciar o torneio e criar as partidas da rodada 1", async () => {
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneioAberto })),
        });
        const inscricaoGw = criarMockInscricaoGateway({
            listarPorTorneio: jest.fn().mockResolvedValue(inscricoesComCheckIn),
        });
        const partidaGw = criarMockPartidaGateway();
        const usuarioGw = criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios) });

        const uc = IniciarTorneio.criar(torneioGw, inscricaoGw, partidaGw, usuarioGw);

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false });

        expect(resultado.torneioId).toBe("t-1");
        expect(resultado.rodadaAtual).toBe(1);
        expect(resultado.totalRodadas).toBe(2); // ceil(log2(4)) = 2
        expect(resultado.partidas).toHaveLength(2);
        expect(resultado.partidas[0].jogador1Nome).toBeDefined();
        expect(torneioGw.atualizarECriarPartidas).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se o torneio não for encontrado", async () => {
        const uc = IniciarTorneio.criar(
            criarMockTorneioGateway(),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "inexistente", donoId: "d", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se não for o dono do torneio e não for admin", async () => {
        const uc = IniciarTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue({ ...torneioAberto }) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "outro", isAdmin: false })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode iniciar torneio de outro usuário", async () => {
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneioAberto })),
        });
        const uc = IniciarTorneio.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoesComCheckIn) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "admin-id", isAdmin: true });

        expect(resultado.torneioId).toBe("t-1");
        expect(resultado.rodadaAtual).toBe(1);
    });

    it("deve lançar erro se o torneio já foi iniciado", async () => {
        const torneioEmAndamento = { ...torneioAberto, status: "em_andamento" as const };
        const uc = IniciarTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se houver menos de 2 jogadores com check-in", async () => {
        const apenasUm = [inscricoesComCheckIn[0]];
        const uc = IniciarTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue({ ...torneioAberto }) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(apenasUm) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve usar maxRodadas quando configurado no torneio", async () => {
        const torneioComMaxRodadas = new Torneio({
            id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
            donoId: "dono-1", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
            maxRodadas: 1,
        });
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioComMaxRodadas),
        });
        const uc = IniciarTorneio.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoesComCheckIn) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false });

        // 4 jogadores -> ceil(log2(4)) = 2 por padrão, mas maxRodadas = 1 limita o total.
        expect(resultado.totalRodadas).toBe(1);
    });

    it("não deve aumentar totalRodadas quando maxRodadas for maior que o calculado", async () => {
        const torneioComMaxRodadas = new Torneio({
            id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
            donoId: "dono-1", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
            maxRodadas: 5,
        });
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioComMaxRodadas),
        });
        const uc = IniciarTorneio.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoesComCheckIn) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false });

        expect(resultado.totalRodadas).toBe(2);
    });

    it("deve gerar bye quando número ímpar de jogadores", async () => {
        const tresJogadores = inscricoesComCheckIn.slice(0, 3);
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneioAberto })),
        });
        const uc = IniciarTorneio.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(tresJogadores) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({
                buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios.slice(0, 3)),
            }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false });

        expect(resultado.partidas).toHaveLength(2);
        const byes = resultado.partidas.filter((p) => p.jogador2Id === null);
        expect(byes).toHaveLength(1);
    });

    it("deve excluir jogadores dropados do check-in ao iniciar torneio", async () => {
        const inscricoesComDrop = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkIn: true, checkInRodada: 0, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkIn: true, checkInRodada: 0, dropped: true }), // dropado
            new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkIn: true, checkInRodada: 0, dropped: false }),
        ];
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneioAberto })),
        });
        const uc = IniciarTorneio.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoesComDrop) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({
                buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios.filter(u => u.id !== "u-2")),
            }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false });

        // 2 jogadores ativos (u-1, u-3) = 1 partida
        expect(resultado.partidas).toHaveLength(1);
        const todosJogadores = resultado.partidas.flatMap(p => [p.jogador1Id, p.jogador2Id]);
        expect(todosJogadores).not.toContain("u-2");
    });

    it("deve calcular totalRodadas = 1 quando há exatamente 2 jogadores", async () => {
        const doisJogadores = inscricoesComCheckIn.slice(0, 2);
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneioAberto })),
        });
        const uc = IniciarTorneio.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(doisJogadores) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios.slice(0, 2)) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false });

        expect(resultado.totalRodadas).toBe(1);
        expect(resultado.partidas).toHaveLength(1);
    });

    it("deve excluir jogadores sem check-in do torneio", async () => {
        const inscricoesMistura = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkIn: true, checkInRodada: 0, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkIn: false, checkInRodada: -1, dropped: false }), // sem check-in
            new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkIn: true, checkInRodada: 0, dropped: false }),
        ];
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneioAberto })),
        });
        const uc = IniciarTorneio.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoesMistura) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({
                buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios.filter(u => u.id !== "u-2")),
            }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false });

        expect(resultado.partidas).toHaveLength(1); // 2 jogadores = 1 partida
    });

    it("deve lançar 400 quando torneio está finalizado", async () => {
        const torneioFinalizado = { ...torneioAberto, status: "finalizado" as const };
        const uc = IniciarTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioFinalizado) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve mapear nomes dos jogadores corretamente nas partidas de saída", async () => {
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneioAberto })),
        });
        const uc = IniciarTorneio.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoesComCheckIn) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false });

        // All jogador1Nome and jogador2Nome should be real names, not IDs
        for (const p of resultado.partidas) {
            expect(p.jogador1Nome).not.toBe(p.jogador1Id);
            if (p.jogador2Id) {
                expect(p.jogador2Nome).not.toBe(p.jogador2Id);
            }
        }
    });
});
