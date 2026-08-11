import { AjustarTotalRodadas } from "../../../src/casosDeUso/torneio/ajustarTotalRodadas";
import { criarMockTorneioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";

describe("AjustarTotalRodadas", () => {
    const torneioBase = () =>
        new Torneio({
            id: "t-1",
            nome: "Torneio",
            horario: new Date(),
            formato: "legacy",
            donoId: "dono-1",
            status: "em_andamento",
            rodadaAtual: 3,
            totalRodadas: 5,
        });

    it("aumenta o total de rodadas Swiss", async () => {
        const torneio = torneioBase();
        const atualizar = jest.fn().mockResolvedValue(undefined);
        const uc = AjustarTotalRodadas.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar,
            }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            usuarioId: "dono-1",
            isAdmin: false,
            totalRodadas: 7,
        });

        expect(resultado).toEqual({
            torneioId: "t-1",
            rodadaAtual: 3,
            totalRodadasAnterior: 5,
            totalRodadas: 7,
            emCorte: false,
        });
        expect(torneio.totalRodadas).toBe(7);
        expect(atualizar).toHaveBeenCalledWith(torneio);
    });

    it("reduz o total até a rodada atual", async () => {
        const torneio = torneioBase();
        const uc = AjustarTotalRodadas.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar: jest.fn().mockResolvedValue(undefined),
            }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            usuarioId: "dono-1",
            isAdmin: false,
            totalRodadas: 3,
        });

        expect(resultado.totalRodadas).toBe(3);
        expect(resultado.totalRodadasAnterior).toBe(5);
    });

    it("não chama atualizar se o total for igual ao atual", async () => {
        const atualizar = jest.fn();
        const uc = AjustarTotalRodadas.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneioBase()),
                atualizar,
            }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            usuarioId: "dono-1",
            isAdmin: false,
            totalRodadas: 5,
        });

        expect(resultado.totalRodadas).toBe(5);
        expect(atualizar).not.toHaveBeenCalled();
    });

    it("rejeita total menor que a rodada atual", async () => {
        const uc = AjustarTotalRodadas.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneioBase()),
            }),
        );

        await expect(
            uc.executar({
                torneioId: "t-1",
                usuarioId: "dono-1",
                isAdmin: false,
                totalRodadas: 2,
            }),
        ).rejects.toMatchObject({ status: 400 });
    });

    it("bloqueia ajuste durante o corte", async () => {
        const torneio = new Torneio({
            ...torneioBase(),
            emCorte: true,
        });
        const uc = AjustarTotalRodadas.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
            }),
        );

        await expect(
            uc.executar({
                torneioId: "t-1",
                usuarioId: "dono-1",
                isAdmin: false,
                totalRodadas: 6,
            }),
        ).rejects.toMatchObject({ status: 400 });
    });

    it("bloqueia se o torneio não estiver em andamento", async () => {
        const torneio = new Torneio({
            ...torneioBase(),
            status: "inscricoes_abertas",
            rodadaAtual: 0,
            totalRodadas: 0,
        });
        const uc = AjustarTotalRodadas.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
            }),
        );

        await expect(
            uc.executar({
                torneioId: "t-1",
                usuarioId: "dono-1",
                isAdmin: false,
                totalRodadas: 4,
            }),
        ).rejects.toMatchObject({ status: 400 });
    });

    it("exige permissão de gestão", async () => {
        const uc = AjustarTotalRodadas.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneioBase()),
            }),
        );

        await expect(
            uc.executar({
                torneioId: "t-1",
                usuarioId: "outro",
                isAdmin: false,
                totalRodadas: 6,
            }),
        ).rejects.toMatchObject({ status: 403 });
    });

    it("retorna 404 se o torneio não existir", async () => {
        const uc = AjustarTotalRodadas.criar(criarMockTorneioGateway());

        await expect(
            uc.executar({
                torneioId: "inexistente",
                usuarioId: "dono-1",
                isAdmin: false,
                totalRodadas: 4,
            }),
        ).rejects.toMatchObject({ status: 404 });
    });

    it("rejeita total fora do intervalo 1–30", async () => {
        const uc = AjustarTotalRodadas.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneioBase()),
            }),
        );

        await expect(
            uc.executar({
                torneioId: "t-1",
                usuarioId: "dono-1",
                isAdmin: false,
                totalRodadas: 31,
            }),
        ).rejects.toMatchObject({ status: 400 });
    });
});
