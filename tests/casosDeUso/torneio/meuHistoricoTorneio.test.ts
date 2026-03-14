import { MeuHistoricoTorneio } from "../../../src/casosDeUso/torneio/meuHistoricoTorneio";
import { criarMockTorneioGateway, criarMockPartidaGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("MeuHistoricoTorneio", () => {
    const torneio = new Torneio({
        id: "t-1", nome: "T", horario: new Date(), formato: "f",
        donoId: "d", status: "em_andamento", rodadaAtual: 2, totalRodadas: 3,
    });

    it("deve retornar histórico de partidas do jogador", async () => {
        const partidas = [
            new Partida({
                id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2",
                vitoriasJogador1: 2, vitoriasJogador2: 1, status: "finalizada",
            }),
            new Partida({
                id: "p2", torneioId: "t-1", rodada: 2, jogador1Id: "u-3", jogador2Id: "u-1",
                vitoriasJogador1: 0, vitoriasJogador2: 2, status: "finalizada",
            }),
        ];
        const usuarios = [
            new Usuario({ id: "u-2", nome: "Maria", email: "m@e.com", senha: "s" }),
            new Usuario({ id: "u-3", nome: "Pedro", email: "p@e.com", senha: "s" }),
        ];

        const uc = MeuHistoricoTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ listarPorJogadorETorneio: jest.fn().mockResolvedValue(partidas) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", usuarioId: "u-1" });

        expect(resultado.partidas).toHaveLength(2);
        expect(resultado.partidas[0].resultado).toBe("vitoria");
        expect(resultado.partidas[0].oponenteNome).toBe("Maria");
        expect(resultado.partidas[1].resultado).toBe("vitoria");
        expect(resultado.partidas[1].oponenteNome).toBe("Pedro");
    });

    it("deve identificar bye corretamente", async () => {
        const partidas = [
            new Partida({
                id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: null,
                vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada",
            }),
        ];

        const uc = MeuHistoricoTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ listarPorJogadorETorneio: jest.fn().mockResolvedValue(partidas) }),
            criarMockUsuarioGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-1", usuarioId: "u-1" });
        expect(resultado.partidas[0].resultado).toBe("bye");
        expect(resultado.partidas[0].oponenteId).toBeNull();
    });

    it("deve identificar derrota corretamente", async () => {
        const partidas = [
            new Partida({
                id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2",
                vitoriasJogador1: 0, vitoriasJogador2: 2, status: "finalizada",
            }),
        ];

        const uc = MeuHistoricoTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ listarPorJogadorETorneio: jest.fn().mockResolvedValue(partidas) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([new Usuario({ id: "u-2", nome: "Maria", email: "m@e.com", senha: "s" })]) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", usuarioId: "u-1" });
        expect(resultado.partidas[0].resultado).toBe("derrota");
    });

    it("deve identificar empate corretamente", async () => {
        const partidas = [
            new Partida({
                id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2",
                vitoriasJogador1: 1, vitoriasJogador2: 1, status: "finalizada",
            }),
        ];

        const uc = MeuHistoricoTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ listarPorJogadorETorneio: jest.fn().mockResolvedValue(partidas) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([new Usuario({ id: "u-2", nome: "Maria", email: "m@e.com", senha: "s" })]) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", usuarioId: "u-1" });
        expect(resultado.partidas[0].resultado).toBe("empate");
    });

    it("deve lançar erro se torneio não encontrado", async () => {
        const uc = MeuHistoricoTorneio.criar(
            criarMockTorneioGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "x", usuarioId: "u" })
        ).rejects.toMatchObject({ status: 404 });
    });
});
