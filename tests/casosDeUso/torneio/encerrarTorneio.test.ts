import { EncerrarTorneio } from "../../../src/casosDeUso/torneio/encerrarTorneio";
import { criarMockTorneioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";

describe("EncerrarTorneio", () => {
    const torneioBase = () =>
        new Torneio({
            id: "t-1",
            nome: "Torneio",
            horario: new Date(),
            formato: "modern",
            donoId: "dono-1",
            status: "em_andamento",
            rodadaAtual: 4,
            totalRodadas: 6,
        });

    it("finaliza o torneio imediatamente com o ranking atual", async () => {
        const torneio = torneioBase();
        const atualizar = jest.fn().mockResolvedValue(undefined);
        const uc = EncerrarTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar,
            }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            usuarioId: "dono-1",
            isAdmin: false,
        });

        expect(resultado).toEqual({
            torneioId: "t-1",
            status: "finalizado",
            rodadaAtual: 4,
            totalRodadas: 6,
            finalizado: true,
        });
        expect(torneio.status).toBe("finalizado");
        expect(atualizar).toHaveBeenCalledWith(torneio);
    });

    it("ajusta totalRodadas para a rodada atual quando estava maior no calendário", async () => {
        const torneio = new Torneio({
            ...torneioBase(),
            rodadaAtual: 5,
            totalRodadas: 3,
        });
        const uc = EncerrarTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar: jest.fn().mockResolvedValue(undefined),
            }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            usuarioId: "dono-1",
            isAdmin: false,
        });

        expect(resultado.totalRodadas).toBe(5);
        expect(torneio.totalRodadas).toBe(5);
    });

    it("permite admin encerrar", async () => {
        const torneio = torneioBase();
        const uc = EncerrarTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar: jest.fn().mockResolvedValue(undefined),
            }),
        );

        const resultado = await uc.executar({
            torneioId: "t-1",
            usuarioId: "admin-x",
            isAdmin: true,
        });

        expect(resultado.finalizado).toBe(true);
    });

    it("bloqueia quem não gerencia o torneio", async () => {
        const uc = EncerrarTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneioBase()),
            }),
        );

        await expect(
            uc.executar({
                torneioId: "t-1",
                usuarioId: "outro",
                isAdmin: false,
            }),
        ).rejects.toMatchObject({ status: 403 });
    });

    it("só encerra torneio em andamento", async () => {
        const torneio = new Torneio({
            ...torneioBase(),
            status: "finalizado",
        });
        const uc = EncerrarTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
            }),
        );

        await expect(
            uc.executar({
                torneioId: "t-1",
                usuarioId: "dono-1",
                isAdmin: false,
            }),
        ).rejects.toMatchObject({ status: 400 });
    });

    it("retorna 404 se o torneio não existir", async () => {
        const uc = EncerrarTorneio.criar(criarMockTorneioGateway());

        await expect(
            uc.executar({
                torneioId: "inexistente",
                usuarioId: "dono-1",
                isAdmin: false,
            }),
        ).rejects.toMatchObject({ status: 404 });
    });
});
