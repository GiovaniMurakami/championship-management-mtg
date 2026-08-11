import { AtualizarPareamentosRodada } from "../../../src/casosDeUso/torneio/atualizarPareamentosRodada";
import {
    criarMockInscricaoGateway,
    criarMockPartidaGateway,
    criarMockTorneioGateway,
    criarMockUsuarioGateway,
} from "../../mocks/gateways";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("AtualizarPareamentosRodada", () => {
    const torneio = new Torneio({
        id: "t-1",
        nome: "Torneio",
        horario: new Date(),
        formato: "modern",
        donoId: "dono-1",
        status: "em_andamento",
        rodadaAtual: 2,
        totalRodadas: 4,
    });

    const inscricoes = [
        new Inscricao({ id: "i-1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 2, dropped: false, deckId: "deck-1" }),
        new Inscricao({ id: "i-2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 2, dropped: false, deckId: "deck-2" }),
        new Inscricao({ id: "i-3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 2, dropped: false, deckId: "deck-3" }),
        new Inscricao({ id: "i-4", torneioId: "t-1", usuarioId: "u-4", checkInRodada: 2, dropped: false, deckId: "deck-4" }),
        new Inscricao({ id: "i-5", torneioId: "t-1", usuarioId: "u-5", checkInRodada: 2, dropped: false, deckId: "deck-5" }),
    ];

    function criarPartidasRodadaBase() {
        return [
            new Partida({
                id: "p-1",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u-1",
                jogador2Id: "u-2",
                deckJogador1Id: "deck-1",
                deckJogador2Id: "deck-2",
                vitoriasJogador1: 0,
                vitoriasJogador2: 0,
                status: "pendente",
                mesa: 1,
                contestado: true,
                confirmadoPor: ["u-1"],
            }),
            new Partida({
                id: "p-2",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u-3",
                jogador2Id: "u-4",
                deckJogador1Id: "deck-3",
                deckJogador2Id: "deck-4",
                vitoriasJogador1: 1,
                vitoriasJogador2: 1,
                status: "pendente",
                mesa: 2,
                contestado: true,
                confirmadoPor: ["u-3", "u-4"],
            }),
        ];
    }

    const usuarios = [
        new Usuario({ id: "u-1", nome: "Jogador 1", email: "u1@test.com", senha: "s" }),
        new Usuario({ id: "u-2", nome: "Jogador 2", email: "u2@test.com", senha: "s" }),
        new Usuario({ id: "u-3", nome: "Jogador 3", email: "u3@test.com", senha: "s" }),
        new Usuario({ id: "u-4", nome: "Jogador 4", email: "u4@test.com", senha: "s" }),
        new Usuario({ id: "u-5", nome: "Jogador 5", email: "u5@test.com", senha: "s" }),
    ];

    it("deve permitir reordenar mesas e trocar os pareamentos pendentes", async () => {
        const partidasRodada = criarPartidasRodadaBase();
        const atualizarMock = jest.fn().mockImplementation(async (partida: Partida) => partida);
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada),
                atualizar: atualizarMock,
            }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            rodada: 2,
            requisitanteId: "dono-1",
            isAdmin: false,
            partidas: [
                { id: "p-1", jogador1Id: "u-1", jogador2Id: "u-4", mesa: 2 },
                { id: "p-2", jogador1Id: "u-2", jogador2Id: "u-3", mesa: 1 },
            ],
        });

        expect(resultado.partidas).toHaveLength(2);
        expect(resultado.partidas[0]).toMatchObject({
            id: "p-2",
            jogador1Id: "u-2",
            jogador2Id: "u-3",
            mesa: 1,
            status: "pendente",
            vitoriasJogador1: 0,
            vitoriasJogador2: 0,
        });
        expect(resultado.partidas[1]).toMatchObject({
            id: "p-1",
            jogador1Id: "u-1",
            jogador2Id: "u-4",
            mesa: 2,
            status: "pendente",
        });
        expect(partidasRodada[0].confirmadoPor).toEqual([]);
        expect(partidasRodada[0].contestado).toBe(false);
        expect(partidasRodada[1].deckJogador1Id).toBe("deck-2");
        expect(partidasRodada[1].deckJogador2Id).toBe("deck-3");
        expect(atualizarMock).toHaveBeenCalledTimes(2);
    });

    it("deve permitir criar mesa BYE nova e incluir jogador que não estava na rodada", async () => {
        const partidasRodada = [criarPartidasRodadaBase()[0]];
        const salvarMock = jest.fn().mockImplementation(async (partida: Partida) => partida);
        const excluirMock = jest.fn().mockResolvedValue(0);
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada),
                atualizar: jest.fn().mockImplementation(async (partida: Partida) => partida),
                salvar: salvarMock,
                excluirPorIds: excluirMock,
            }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            rodada: 2,
            requisitanteId: "dono-1",
            isAdmin: false,
            partidas: [
                { id: "p-1", jogador1Id: "u-1", jogador2Id: "u-2", mesa: 1 },
                { id: null, jogador1Id: "u-5", jogador2Id: null, mesa: 2 },
            ],
        });

        expect(salvarMock).toHaveBeenCalledTimes(1);
        expect(resultado.partidas).toHaveLength(2);
        expect(resultado.partidas.some((p) => p.jogador1Id === "u-5" && p.jogador2Id === null)).toBe(true);
    });

    it("deve excluir mesa pendente omitida e travar mesa finalizada", async () => {
        const partidasRodada = [
            new Partida({
                id: "p-1",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u-1",
                jogador2Id: "u-2",
                deckJogador1Id: "deck-1",
                deckJogador2Id: "deck-2",
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
                mesa: 1,
            }),
            new Partida({
                id: "p-2",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u-3",
                jogador2Id: "u-4",
                deckJogador1Id: "deck-3",
                deckJogador2Id: "deck-4",
                vitoriasJogador1: 0,
                vitoriasJogador2: 0,
                status: "pendente",
                mesa: 2,
            }),
        ];
        const excluirMock = jest.fn().mockResolvedValue(1);
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada),
                atualizar: jest.fn().mockImplementation(async (partida: Partida) => partida),
                excluirPorIds: excluirMock,
                salvar: jest.fn(),
            }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            rodada: 2,
            requisitanteId: "dono-1",
            isAdmin: false,
            partidas: [
                { id: "p-1", jogador1Id: "u-1", jogador2Id: "u-2", mesa: 1 },
                { id: null, jogador1Id: "u-5", jogador2Id: "u-3", mesa: 2 },
            ],
        });

        expect(excluirMock).toHaveBeenCalledWith(["p-2"]);
        expect(resultado.partidas).toHaveLength(2);
        expect(resultado.partidas.find((p) => p.id === "p-1")?.status).toBe("finalizada");
    });

    it("deve rejeitar alteração de jogadores em partida finalizada", async () => {
        const partidasRodada = [
            new Partida({
                id: "p-1",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u-1",
                jogador2Id: "u-2",
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
                mesa: 1,
            }),
        ];
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada),
            }),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({
                torneioId: "t-1",
                rodada: 2,
                requisitanteId: "dono-1",
                isAdmin: false,
                partidas: [{ id: "p-1", jogador1Id: "u-1", jogador2Id: "u-3", mesa: 1 }],
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "Partidas finalizadas não podem ter jogadores alterados.",
        });
    });

    it("deve converter a partida editada em BYE normal quando jogador2 for removido", async () => {
        const partidasRodada = criarPartidasRodadaBase();
        const atualizarMock = jest.fn().mockImplementation(async (partida: Partida) => partida);
        const excluirMock = jest.fn().mockResolvedValue(1);
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada),
                atualizar: atualizarMock,
                excluirPorIds: excluirMock,
            }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            rodada: 2,
            requisitanteId: "dono-1",
            isAdmin: false,
            partidas: [
                { id: "p-1", jogador1Id: "u-1", jogador2Id: null, mesa: 1 },
            ],
        });

        expect(excluirMock).toHaveBeenCalledWith(["p-2"]);
        const bye = resultado.partidas.find((partida) => partida.id === "p-1");
        expect(bye).toMatchObject({
            jogador1Id: "u-1",
            jogador2Id: null,
            mesa: 1,
            status: "finalizada",
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
        });
    });

    it("deve lançar 404 se o torneio não existir", async () => {
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway(),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "nao-existe", rodada: 2, requisitanteId: "dono-1", isAdmin: false, partidas: [] })
        ).rejects.toMatchObject({ status: 404, message: "Torneio não encontrado." });
    });

    it("deve lançar erro se o torneio não estiver em andamento", async () => {
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio, status: "finalizado" })),
            }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", rodada: 2, requisitanteId: "dono-1", isAdmin: false, partidas: [] })
        ).rejects.toMatchObject({ status: 400, message: "Pareamentos só podem ser alterados enquanto o torneio está em andamento." });
    });

    it("deve lançar erro se a rodada informada não for a rodada atual", async () => {
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", rodada: 1, requisitanteId: "dono-1", isAdmin: false, partidas: [] })
        ).rejects.toMatchObject({ status: 400, message: "Somente a rodada atual pode ter pareamentos editados." });
    });

    it("deve lançar 403 para usuário sem permissão", async () => {
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", rodada: 2, requisitanteId: "outro", isAdmin: false, partidas: [] })
        ).rejects.toMatchObject({ status: 403, message: "Apenas o dono, anfitrião ou administrador do torneio pode alterar pareamentos." });
    });

    it("deve lançar erro se não existirem partidas para a rodada", async () => {
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({ listarPorTorneioERodada: jest.fn().mockResolvedValue([]) }),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", rodada: 2, requisitanteId: "dono-1", isAdmin: false, partidas: [] })
        ).rejects.toMatchObject({ status: 404, message: "Não existem partidas para a rodada informada." });
    });

    it("deve lançar erro se um jogador inativo aparecer nos pareamentos", async () => {
        const partidasRodada = criarPartidasRodadaBase();
        const inscricoesComDrop = [
            new Inscricao({ id: "i-1", torneioId: "t-1", usuarioId: "u-1", checkInRodada: 2, dropped: false, deckId: "deck-1" }),
            new Inscricao({ id: "i-2", torneioId: "t-1", usuarioId: "u-2", checkInRodada: 2, dropped: true, deckId: "deck-2" }),
            new Inscricao({ id: "i-3", torneioId: "t-1", usuarioId: "u-3", checkInRodada: 2, dropped: false, deckId: "deck-3" }),
            new Inscricao({ id: "i-4", torneioId: "t-1", usuarioId: "u-4", checkInRodada: 2, dropped: false, deckId: "deck-4" }),
        ];
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoesComDrop) }),
            criarMockPartidaGateway({ listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada) }),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({
                torneioId: "t-1",
                rodada: 2,
                requisitanteId: "dono-1",
                isAdmin: false,
                partidas: [
                    { id: "p-1", jogador1Id: "u-1", jogador2Id: "u-2", mesa: 1 },
                    { id: "p-2", jogador1Id: "u-3", jogador2Id: "u-4", mesa: 2 },
                ],
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "Todos os jogadores dos pareamentos precisam estar ativos no torneio.",
        });
    });

    it("deve lançar erro se a rodada editada terminar com mais de um BYE", async () => {
        const partidasRodada = [
            new Partida({
                id: "p-1",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u-1",
                jogador2Id: null,
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
                tipoBye: "normal",
                mesa: 1,
            }),
            new Partida({
                id: "p-2",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u-2",
                jogador2Id: "u-3",
                vitoriasJogador1: 0,
                vitoriasJogador2: 0,
                status: "pendente",
                mesa: 2,
            }),
        ];
        const uc = AtualizarPareamentosRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(new Torneio({ ...torneio })) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({ listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada) }),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({
                torneioId: "t-1",
                rodada: 2,
                requisitanteId: "dono-1",
                isAdmin: false,
                partidas: [
                    { id: "p-1", jogador1Id: "u-1", jogador2Id: null, mesa: 1 },
                    { id: "p-2", jogador1Id: "u-2", jogador2Id: null, mesa: 2 },
                ],
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "A rodada pode ter no máximo um BYE.",
        });
    });
});
