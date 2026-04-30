import { AlterarTorneio } from "../../../src/casosDeUso/torneio/alterarTorneio";
import { criarMockTorneioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";

describe("AlterarTorneio", () => {
    const torneioExistente = new Torneio({
        id: "torneio-1",
        nome: "Grand Prix SP",
        horario: new Date("2025-06-01T10:00:00Z"),
        formato: "modern",
        donoId: "user-1",
        status: "inscricoes_abertas",
        rodadaAtual: 0,
        totalRodadas: 0,
        emCorte: false,
    });

    it("deve alterar o torneio com sucesso", async () => {
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...torneioExistente }),
        });
        const uc = AlterarTorneio.criar(gateway);

        const resultado = await uc.executar({
            id: "torneio-1",
            requisitanteId: "user-1",
            isAdmin: false,
            nome: "  Grand Prix RJ  ",
            formato: "LEGACY",
        });

        expect(resultado.nome).toBe("Grand Prix RJ");
        expect(resultado.formato).toBe("legacy");
        expect(gateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve alterar apenas os campos enviados", async () => {
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...torneioExistente }),
        });
        const uc = AlterarTorneio.criar(gateway);

        const resultado = await uc.executar({
            id: "torneio-1",
            requisitanteId: "user-1",
            isAdmin: false,
            premio: "R$ 500",
        });

        expect(resultado.nome).toBe("Grand Prix SP");
        expect(resultado.formato).toBe("modern");
        expect(resultado.premio).toBe("R$ 500");
    });

    it("deve lançar 404 se torneio não existir", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = AlterarTorneio.criar(gateway);

        await expect(
            uc.executar({ id: "inexistente", requisitanteId: "user-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 403 se não for dono nem admin", async () => {
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...torneioExistente }),
        });
        const uc = AlterarTorneio.criar(gateway);

        await expect(
            uc.executar({ id: "torneio-1", requisitanteId: "outro-user", isAdmin: false })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode alterar torneio de outro usuário", async () => {
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...torneioExistente }),
        });
        const uc = AlterarTorneio.criar(gateway);

        const resultado = await uc.executar({
            id: "torneio-1",
            requisitanteId: "admin-id",
            isAdmin: true,
            nome: "Alterado pelo Admin",
        });

        expect(resultado.nome).toBe("Alterado pelo Admin");
    });

    it("deve lançar erro se torneio não estiver com inscrições abertas", async () => {
        const torneioEmAndamento = new Torneio({
            ...torneioExistente,
            status: "em_andamento",
        });
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento),
        });
        const uc = AlterarTorneio.criar(gateway);

        await expect(
            uc.executar({ id: "torneio-1", requisitanteId: "user-1", isAdmin: false, nome: "Novo" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve alterar todos os campos opcionais", async () => {
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...torneioExistente }),
        });
        const uc = AlterarTorneio.criar(gateway);
        const novoHorario = new Date("2025-07-01T14:00:00Z");

        const resultado = await uc.executar({
            id: "torneio-1",
            requisitanteId: "user-1",
            isAdmin: false,
            nome: "Novo Nome",
            horario: novoHorario,
            formato: "Vintage",
            premio: "R$ 1000",
            bannerUrl: "https://example.com/banner.jpg",
            linkBanner: "https://example.com",
            somRodada: "https://example.com/som.mp3",
            maxJogadores: 64,
            maxRodadas: 7,
            corteTop: 8,
            linkLive: "https://twitch.tv/example",
        });

        expect(resultado.nome).toBe("Novo Nome");
        expect(resultado.horario).toEqual(novoHorario);
        expect(resultado.formato).toBe("vintage");
        expect(resultado.premio).toBe("R$ 1000");
        expect(resultado.bannerUrl).toBe("https://example.com/banner.jpg");
        expect(resultado.linkBanner).toBe("https://example.com");
        expect(resultado.somRodada).toBe("https://example.com/som.mp3");
        expect(resultado.maxJogadores).toBe(64);
        expect(resultado.maxRodadas).toBe(7);
        expect(resultado.corteTop).toBe(8);
        expect(resultado.linkLive).toBe("https://twitch.tv/example");
        expect(gateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve alterar o campo secreto", async () => {
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...torneioExistente }),
        });
        const uc = AlterarTorneio.criar(gateway);

        const resultado = await uc.executar({
            id: "torneio-1",
            requisitanteId: "user-1",
            isAdmin: false,
            secreto: true,
        });

        expect(resultado.secreto).toBe(true);
        expect(gateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve limpar campos textuais opcionais quando receber null em runtime", async () => {
        const gateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue({
                ...torneioExistente,
                premio: "Premio",
                bannerUrl: "https://example.com/banner.jpg",
                linkBanner: "https://example.com",
                somRodada: "https://example.com/som.mp3",
                linkLive: "https://twitch.tv/example",
            }),
        });
        const uc = AlterarTorneio.criar(gateway);

        const resultado = await uc.executar({
            id: "torneio-1",
            requisitanteId: "user-1",
            isAdmin: false,
            premio: null,
            bannerUrl: null,
            linkBanner: null,
            somRodada: null,
            linkLive: null,
            exibirNomeJogador: "nickArena",
        } as any);

        expect(resultado.premio).toBeUndefined();
        expect(resultado.bannerUrl).toBeUndefined();
        expect(resultado.linkBanner).toBeUndefined();
        expect(resultado.somRodada).toBeUndefined();
        expect(resultado.linkLive).toBeUndefined();
        expect(resultado.exibirNomeJogador).toBe("nickArena");
    });
});
