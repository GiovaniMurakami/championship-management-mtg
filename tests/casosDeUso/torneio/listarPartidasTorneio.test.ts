import { ListarPartidasTorneio } from "../../../src/casosDeUso/torneio/listarPartidasTorneio";
import { criarMockPartidaGateway, criarMockTorneioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Partida } from "../../../src/dominio/entidade/partida";

describe("ListarPartidasTorneio", () => {
    it("deve listar partidas filtradas por torneio", async () => {
        const torneio = new Torneio({
            id: "t-1",
            nome: "FNM",
            horario: new Date(),
            formato: "modern",
            donoId: "u-1",
            status: "em_andamento",
            rodadaAtual: 1,
            totalRodadas: 3,
        });

        const partidas = [
            new Partida({
                id: "p-1",
                torneioId: "t-1",
                rodada: 1,
                jogador1Id: "u-1",
                jogador1Nome: "Jogador 1",
                jogador2Id: "u-2",
                jogador2Nome: "Jogador 2",
                vitoriasJogador1: 2,
                vitoriasJogador2: 1,
                status: "finalizada",
            }),
            new Partida({
                id: "p-2",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u-3",
                jogador1Nome: "Jogador 3",
                jogador2Id: null,
                jogador2Nome: null,
                vitoriasJogador1: 2,
                vitoriasJogador2: 0,
                status: "finalizada",
            }),
        ];

        const uc = ListarPartidasTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ listarPorTorneio: jest.fn().mockResolvedValue(partidas) })
        );

        const resultado = await uc.executar({ torneioId: "t-1" });

        expect(resultado.torneioId).toBe("t-1");
        expect(resultado.partidas).toHaveLength(2);
        expect(resultado.partidas[0].id).toBe("p-1");
        expect(resultado.partidas[0].jogador1Nome).toBe("Jogador 1");
        expect(resultado.partidas[1].jogador2Id).toBeNull();
        expect(resultado.partidas[1].jogador2Nome).toBeNull();
    });

    it("deve lançar erro quando torneio não existe", async () => {
        const uc = ListarPartidasTorneio.criar(
            criarMockTorneioGateway(),
            criarMockPartidaGateway()
        );

        await expect(
            uc.executar({ torneioId: "nao-existe" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve listar partidas de uma rodada específica", async () => {
        const torneio = new Torneio({
            id: "t-1",
            nome: "FNM",
            horario: new Date(),
            formato: "modern",
            donoId: "u-1",
            status: "em_andamento",
            rodadaAtual: 2,
            totalRodadas: 3,
        });

        const listarPorTorneioERodada = jest.fn().mockResolvedValue([
            new Partida({
                id: "p-2",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u-1",
                jogador1Nome: "Jogador 1",
                jogador2Id: "u-3",
                jogador2Nome: "Jogador 3",
                vitoriasJogador1: 0,
                vitoriasJogador2: 0,
                status: "pendente",
            }),
        ]);

        const uc = ListarPartidasTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway({ listarPorTorneioERodada })
        );

        const resultado = await uc.executar({ torneioId: "t-1", rodada: 2 });

        expect(listarPorTorneioERodada).toHaveBeenCalledWith("t-1", 2);
        expect(resultado.rodada).toBe(2);
        expect(resultado.partidas).toHaveLength(1);
        expect(resultado.partidas[0].rodada).toBe(2);
        expect(resultado.partidas[0].jogador2Nome).toBe("Jogador 3");
    });

    it("deve lançar erro quando rodada for inválida", async () => {
        const torneio = new Torneio({
            id: "t-1",
            nome: "FNM",
            horario: new Date(),
            formato: "modern",
            donoId: "u-1",
            status: "em_andamento",
            rodadaAtual: 1,
            totalRodadas: 3,
        });

        const uc = ListarPartidasTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockPartidaGateway()
        );

        await expect(
            uc.executar({ torneioId: "t-1", rodada: 0 })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve listar mesas por rodada mesmo com torneio finalizado", async () => {
        const torneioFinalizado = new Torneio({
            id: "t-1",
            nome: "FNM",
            horario: new Date(),
            formato: "modern",
            donoId: "u-1",
            status: "finalizado",
            rodadaAtual: 3,
            totalRodadas: 3,
        });

        const listarPorTorneioERodada = jest.fn().mockResolvedValue([
            new Partida({
                id: "p-final-1",
                torneioId: "t-1",
                rodada: 3,
                jogador1Id: "u-1",
                jogador1Nome: "Jogador 1",
                jogador2Id: "u-2",
                jogador2Nome: "Jogador 2",
                vitoriasJogador1: 2,
                vitoriasJogador2: 1,
                status: "finalizada",
            }),
        ]);

        const uc = ListarPartidasTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioFinalizado) }),
            criarMockPartidaGateway({ listarPorTorneioERodada })
        );

        const resultado = await uc.executar({ torneioId: "t-1", rodada: 3 });

        expect(listarPorTorneioERodada).toHaveBeenCalledWith("t-1", 3);
        expect(resultado.partidas).toHaveLength(1);
        expect(resultado.partidas[0].status).toBe("finalizada");
    });
});
