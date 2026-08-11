import { RefazerRodada } from "../../../src/casosDeUso/torneio/refazerRodada";
import { Torneio, TorneioProps } from "../../../src/dominio/entidade/torneio";
import { Partida } from "../../../src/dominio/entidade/partida";
import { criarMockTorneioGateway, criarMockPartidaGateway } from "../../mocks/gateways";

describe("RefazerRodada", () => {
    const torneioSwiss = (overrides: Partial<TorneioProps> = {}) =>
        new Torneio({
            id: "t-1",
            nome: "Torneio",
            horario: new Date(),
            formato: "modern",
            donoId: "dono-1",
            status: "em_andamento",
            rodadaAtual: 3,
            totalRodadas: 5,
            emCorte: false,
            ...overrides,
        });

    const partidaFake = () =>
        Partida.criar({
            torneioId: "t-1",
            rodada: 3,
            jogador1Id: "j1",
            jogador2Id: "j2",
            mesa: 1,
        });

    it("remove a rodada atual e volta para a anterior (Swiss)", async () => {
        const torneio = torneioSwiss();
        const atualizar = jest.fn().mockResolvedValue(undefined);
        const excluir = jest.fn().mockResolvedValue(2);
        const uc = RefazerRodada.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar,
            }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue([partidaFake(), partidaFake()]),
                excluirPorTorneioERodada: excluir,
            }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            donoId: "dono-1",
            isAdmin: false,
        });

        expect(resultado).toEqual({
            rodadaAtual: 2,
            rodadaRemovida: 3,
            partidasRemovidas: 2,
            emCorte: false,
            totalRodadas: 5,
        });
        expect(torneio.rodadaAtual).toBe(2);
        expect(excluir).toHaveBeenCalledWith("t-1", 3);
        expect(atualizar).toHaveBeenCalledWith(torneio);
    });

    it("ao refazer a primeira rodada de corte, sai do corte e ajusta totalRodadas", async () => {
        // totalRodadas=8, corteTop=8 → rodadasCorte=3 → primeiraRodadaCorte=6
        const torneio = torneioSwiss({
            rodadaAtual: 6,
            totalRodadas: 8,
            corteTop: 8,
            emCorte: true,
        });
        const uc = RefazerRodada.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar: jest.fn().mockResolvedValue(undefined),
            }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue([partidaFake()]),
                excluirPorTorneioERodada: jest.fn().mockResolvedValue(1),
            }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            donoId: "dono-1",
            isAdmin: false,
        });

        expect(resultado.rodadaAtual).toBe(5);
        expect(resultado.emCorte).toBe(false);
        expect(resultado.totalRodadas).toBe(5);
        expect(torneio.emCorte).toBe(false);
        expect(torneio.totalRodadas).toBe(5);
    });

    it("mantém emCorte ao refazer rodada interna do corte", async () => {
        // primeiraRodadaCorte=6; rodadaAtual=7 → anterior=6 ainda em corte
        const torneio = torneioSwiss({
            rodadaAtual: 7,
            totalRodadas: 8,
            corteTop: 8,
            emCorte: true,
        });
        const uc = RefazerRodada.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar: jest.fn().mockResolvedValue(undefined),
            }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue([partidaFake()]),
                excluirPorTorneioERodada: jest.fn().mockResolvedValue(1),
            }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            donoId: "dono-1",
            isAdmin: false,
        });

        expect(resultado.rodadaAtual).toBe(6);
        expect(resultado.emCorte).toBe(true);
        expect(resultado.totalRodadas).toBe(8);
    });

    it("com corteTop inválido (não potência de 2) trata como fora do corte", async () => {
        const torneio = torneioSwiss({
            rodadaAtual: 4,
            totalRodadas: 6,
            corteTop: 3,
            emCorte: true,
        });
        const uc = RefazerRodada.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar: jest.fn().mockResolvedValue(undefined),
            }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue([partidaFake()]),
                excluirPorTorneioERodada: jest.fn().mockResolvedValue(1),
            }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            donoId: "dono-1",
            isAdmin: false,
        });

        expect(resultado.emCorte).toBe(false);
        expect(resultado.totalRodadas).toBe(6);
    });

    it("retorna 404 se torneio não existe", async () => {
        const uc = RefazerRodada.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(null) }),
            criarMockPartidaGateway(),
        );
        await expect(
            uc.executar({ torneioId: "x", donoId: "dono-1", isAdmin: false }),
        ).rejects.toMatchObject({ message: "Torneio não encontrado.", status: 404 });
    });

    it("retorna 403 se não pode gerenciar", async () => {
        const uc = RefazerRodada.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneioSwiss()),
            }),
            criarMockPartidaGateway(),
        );
        await expect(
            uc.executar({ torneioId: "t-1", donoId: "outro", isAdmin: false }),
        ).rejects.toMatchObject({ status: 403 });
    });

    it("rejeita se torneio não está em andamento", async () => {
        const uc = RefazerRodada.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(
                    torneioSwiss({ status: "finalizado" }),
                ),
            }),
            criarMockPartidaGateway(),
        );
        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false }),
        ).rejects.toMatchObject({
            message: expect.stringMatching(/em andamento/i),
            status: 400,
        });
    });

    it("rejeita refazer na rodada 1", async () => {
        const uc = RefazerRodada.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneioSwiss({ rodadaAtual: 1 })),
            }),
            criarMockPartidaGateway(),
        );
        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false }),
        ).rejects.toMatchObject({
            message: expect.stringMatching(/rodada anterior/i),
            status: 400,
        });
    });

    it("rejeita se não há partidas na rodada atual", async () => {
        const uc = RefazerRodada.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneioSwiss()),
            }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue([]),
            }),
        );
        await expect(
            uc.executar({ torneioId: "t-1", donoId: "dono-1", isAdmin: false }),
        ).rejects.toMatchObject({
            message: expect.stringMatching(/Não existem partidas/i),
            status: 400,
        });
    });

    it("com emCorte e corteTop < 2 sai do corte sem alterar totalRodadas", async () => {
        const torneio = torneioSwiss({
            rodadaAtual: 4,
            totalRodadas: 6,
            corteTop: 1,
            emCorte: true,
        });
        const uc = RefazerRodada.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar: jest.fn().mockResolvedValue(undefined),
            }),
            criarMockPartidaGateway({
                listarPorTorneioERodada: jest.fn().mockResolvedValue([partidaFake()]),
                excluirPorTorneioERodada: jest.fn().mockResolvedValue(1),
            }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            donoId: "dono-1",
            isAdmin: false,
        });

        expect(resultado.emCorte).toBe(false);
        expect(resultado.totalRodadas).toBe(6);
    });
});
