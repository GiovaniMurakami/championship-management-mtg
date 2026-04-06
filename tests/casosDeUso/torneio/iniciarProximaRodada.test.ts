import { IniciarProximaRodada } from "../../../src/casosDeUso/torneio/iniciarProximaRodada";
import { criarMockTorneioGateway, criarMockInscricaoGateway, criarMockPartidaGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Partida } from "../../../src/dominio/entidade/partida";
import { criarMockUsuarioGateway } from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("IniciarProximaRodada", () => {
    const torneio = new Torneio({
        id: "t-1", nome: "T", horario: new Date(), formato: "f",
        donoId: "dono", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
    });

    const inscricoes = [
        new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
        new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: false }),
        new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 1, dropped: false }),
        new Inscricao({ id: "i4", torneioId: "t-1", usuarioId: "u-4", checkInRodada: 1, dropped: false }),
    ];

    const partidasRodada1 = [
        new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
        new Partida({ id: "p2", torneioId: "t-1", rodada: 1, jogador1Id: "u-3", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
    ];

    const quatroUsuarios = [
        new Usuario({ id: "u-1", nome: "Jogador 1", email: "u1@e.com", senha: "s" }),
        new Usuario({ id: "u-2", nome: "Jogador 2", email: "u2@e.com", senha: "s" }),
        new Usuario({ id: "u-3", nome: "Jogador 3", email: "u3@e.com", senha: "s" }),
        new Usuario({ id: "u-4", nome: "Jogador 4", email: "u4@e.com", senha: "s" }),
    ];

    it("deve avanÃ§ar para a prÃ³xima rodada criando novas partidas", async () => {
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })),
        });
        const partidaGw = criarMockPartidaGateway({
            listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada1),
            listarPorTorneio: jest.fn().mockResolvedValue(partidasRodada1),
        });

        const uc = IniciarProximaRodada.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            partidaGw,
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false });

        expect(resultado.finalizado).toBe(false);
        if (!resultado.finalizado) {
            expect(resultado.rodadaAtual).toBe(2);
            expect(resultado.partidas).toHaveLength(2);
            expect(resultado.partidas[0].jogador1Nome).toBeDefined();
        }
        expect(torneioGw.atualizarECriarPartidas).toHaveBeenCalled();
    });

    it("deve lanÃ§ar erro se nÃ£o for o dono e nÃ£o for admin", async () => {
        const uc = IniciarProximaRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "outro", isAdmin: false })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode avanÃ§ar rodada de torneio de outro usuÃ¡rio", async () => {
        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })),
        });
        const uc = IniciarProximaRodada.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada1),
                listarPorTorneio: jest.fn().mockResolvedValue(partidasRodada1),
            }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "admin-id", isAdmin: true });

        expect(resultado.finalizado).toBe(false);
    });

    it("deve finalizar o torneio na Ãºltima rodada", async () => {
        const torneioUltimaRodada = new Torneio({ ...torneio, rodadaAtual: 3, totalRodadas: 3 });
        const inscricoesRodada3 = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 3, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 3, dropped: false }),
            new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 3, dropped: false }),
            new Inscricao({ id: "i4", torneioId: "t-1", usuarioId: "u-4", checkInRodada: 3, dropped: false }),
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
            criarMockUsuarioGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false });

        expect(resultado.finalizado).toBe(true);
        if (resultado.finalizado) {
            expect(resultado.classificacao.length).toBeGreaterThan(0);
            expect(resultado.classificacao[0].posicao).toBe(1);
        }
    });

    it("deve finalizar o torneio na Ãºltima rodada sem exigir novo check-in", async () => {
        const torneioUltimaRodada = new Torneio({ ...torneio, rodadaAtual: 3, totalRodadas: 3 });
        const inscricoesSemNovoCheckIn = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 2, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 2, dropped: false }),
            new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 2, dropped: false }),
            new Inscricao({ id: "i4", torneioId: "t-1", usuarioId: "u-4", checkInRodada: 2, dropped: false }),
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
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoesSemNovoCheckIn) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodadaAtual),
                listarPorTorneio: jest.fn().mockResolvedValue(todasPartidas),
            }),
            criarMockUsuarioGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false });

        expect(resultado.finalizado).toBe(true);
    });

    it("deve lanÃ§ar erro se houver partidas pendentes", async () => {
        const partidasPendentes = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 0, vitoriasJogador2: 0, status: "pendente" }),
        ];

        const uc = IniciarProximaRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue({ ...torneio }) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway({ listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasPendentes) }),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve iniciar o corte top 4 ao fim do Swiss", async () => {
        // Torneio: 2 rodadas Swiss completas, corteTop=4
        const torneioComCorte = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "dono", status: "em_andamento", rodadaAtual: 2, totalRodadas: 2,
            corteTop: 4,
        });
        const inscricoesRodada2 = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 2, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 2, dropped: false }),
            new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 2, dropped: false }),
            new Inscricao({ id: "i4", torneioId: "t-1", usuarioId: "u-4", checkInRodada: 2, dropped: false }),
        ];
        const partidasFinais = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
            new Partida({ id: "p2", torneioId: "t-1", rodada: 1, jogador1Id: "u-3", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
            new Partida({ id: "p3", torneioId: "t-1", rodada: 2, jogador1Id: "u-1", jogador2Id: "u-3", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
            new Partida({ id: "p4", torneioId: "t-1", rodada: 2, jogador1Id: "u-2", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
        ];
        const partidasRodada2 = partidasFinais.filter((p) => p.rodada === 2);

        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioComCorte),
        });
        const uc = IniciarProximaRodada.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoesRodada2) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada2),
                listarPorTorneio: jest.fn().mockResolvedValue(partidasFinais),
            }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false });

        expect(resultado.finalizado).toBe(false);
        if (!resultado.finalizado) {
            expect(resultado.emCorte).toBe(true);
            expect(resultado.rodadaAtual).toBe(3); // rodada 3 = semifinais
            expect(resultado.partidas).toHaveLength(2); // top4 = 2 partidas
        }
        // totalRodadas deve ser estendido: rodada 3 (semis) + rodada 4 (final)
        expect(torneioGw.atualizarECriarPartidas).toHaveBeenCalled();
    });

    it("deve gerar prÃ³xima rodada de corte com os vencedores", async () => {
        // Torneio jÃ¡ em corte, nas semifinais (rodada 3 de 4)
        const torneioEmCorte = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "dono", status: "em_andamento", rodadaAtual: 3, totalRodadas: 4,
            corteTop: 4, emCorte: true,
        });
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 2, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 2, dropped: false }),
            new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 2, dropped: false }),
            new Inscricao({ id: "i4", torneioId: "t-1", usuarioId: "u-4", checkInRodada: 2, dropped: false }),
        ];
        const todasPartidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
            new Partida({ id: "p2", torneioId: "t-1", rodada: 1, jogador1Id: "u-3", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
            // Semifinais (corte): u-1 venceu u-4, u-3 venceu u-2
            new Partida({ id: "p3", torneioId: "t-1", rodada: 3, jogador1Id: "u-1", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
            new Partida({ id: "p4", torneioId: "t-1", rodada: 3, jogador1Id: "u-3", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
        ];
        const partidasSemis = todasPartidas.filter((p) => p.rodada === 3);

        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioEmCorte),
        });
        const uc = IniciarProximaRodada.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasSemis),
                listarPorTorneio: jest.fn().mockResolvedValue(todasPartidas),
            }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false });

        expect(resultado.finalizado).toBe(false);
        if (!resultado.finalizado) {
            expect(resultado.emCorte).toBe(true);
            expect(resultado.rodadaAtual).toBe(4); // final
            expect(resultado.partidas).toHaveLength(1); // u-1 vs u-3
            const vencedores = [resultado.partidas[0].jogador1Id, resultado.partidas[0].jogador2Id];
            expect(vencedores).toContain("u-1");
            expect(vencedores).toContain("u-3");
        }
    });

    it("deve lanÃ§ar erro se o torneio nÃ£o estiver em andamento", async () => {
        const torneioAberto = { ...torneio, status: "inscricoes_abertas" as const };
        const uc = IniciarProximaRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioAberto) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lanÃ§ar 404 se o torneio nÃ£o for encontrado", async () => {
        const uc = IniciarProximaRodada.criar(
            criarMockTorneioGateway(), // buscarPorId retorna null por padrÃ£o
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "inexistente", donoId: "dono", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lanÃ§ar erro se menos de 2 jogadores fizeram check-in (nÃ£o Ã© Ãºltima rodada)", async () => {
        const torneioRodada1 = new Torneio({
            ...torneio, rodadaAtual: 1, totalRodadas: 3,
        });
        const apenasUm = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
        ];
        const uc = IniciarProximaRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioRodada1) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(apenasUm) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada1),
                listarPorTorneio: jest.fn().mockResolvedValue(partidasRodada1),
            }),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve excluir jogadores dropados do pareamento da prÃ³xima rodada", async () => {
        const inscricoesComDrop = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 1, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 1, dropped: true }), // dropado
            new Inscricao({ id: "i3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 1, dropped: false }),
            new Inscricao({ id: "i4", torneioId: "t-1", usuarioId: "u-4", checkInRodada: 1, dropped: false }),
        ];

        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })),
        });
        const uc = IniciarProximaRodada.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoesComDrop) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada1),
                listarPorTorneio: jest.fn().mockResolvedValue(partidasRodada1),
            }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios.filter(u => u.id !== "u-2")) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false });

        expect(resultado.finalizado).toBe(false);
        if (!resultado.finalizado) {
            // 3 jogadores ativos: 1 partida + 1 bye
            expect(resultado.partidas).toHaveLength(2);
            const todosJogadores = resultado.partidas.flatMap(p => [p.jogador1Id, p.jogador2Id]);
            expect(todosJogadores).not.toContain("u-2");
        }
    });

    it("deve finalizar corte na Ãºltima rodada de eliminaÃ§Ã£o (final) e retornar classificaÃ§Ã£o", async () => {
        const torneioFinal = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "dono", status: "em_andamento", rodadaAtual: 4, totalRodadas: 4,
            corteTop: 4, emCorte: true,
        });
        const partidaFinal = [
            new Partida({ id: "pf", torneioId: "t-1", rodada: 4, jogador1Id: "u-1", jogador2Id: "u-3", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
        ];
        const todasPartidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
            new Partida({ id: "p2", torneioId: "t-1", rodada: 1, jogador1Id: "u-3", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
            new Partida({ id: "p3", torneioId: "t-1", rodada: 3, jogador1Id: "u-1", jogador2Id: "u-4", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
            new Partida({ id: "p4", torneioId: "t-1", rodada: 3, jogador1Id: "u-3", jogador2Id: "u-2", vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada" }),
            ...partidaFinal,
        ];

        const torneioGw = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioFinal),
        });
        const uc = IniciarProximaRodada.criar(
            torneioGw,
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidaFinal),
                listarPorTorneio: jest.fn().mockResolvedValue(todasPartidas),
            }),
            criarMockUsuarioGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false });

        expect(resultado.finalizado).toBe(true);
        if (resultado.finalizado) {
            expect(resultado.classificacao.length).toBeGreaterThan(0);
            expect(resultado.classificacao[0].posicao).toBe(1);
        }
        expect(torneioGw.atualizar).toHaveBeenCalled();
    });

    it("deve lanÃ§ar erro se nÃ£o houver jogadores suficientes para o corte", async () => {
        const torneioCorte = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "dono", status: "em_andamento", rodadaAtual: 2, totalRodadas: 2,
            corteTop: 8,
        });
        const uc = IniciarProximaRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioCorte) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada1),
                listarPorTorneio: jest.fn().mockResolvedValue(partidasRodada1),
            }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(quatroUsuarios) }),
        );

        // 4 jogadores mas corteTop=8 â†’ nÃ£o hÃ¡ jogadores suficientes
        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });
});
