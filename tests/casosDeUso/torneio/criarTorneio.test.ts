import { CriarTorneio } from "../../../src/casosDeUso/torneio/criarTorneio";
import { criarMockTorneioGateway } from "../../mocks/gateways";

describe("CriarTorneio", () => {
    it("deve criar um torneio com sucesso", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        const resultado = await uc.executar({
            nome: "  Campeonato Legacy  ",
            horario: new Date("2025-06-01T14:00:00Z"),
            formato: "  LEGACY ",
            donoId: "user-1",
            descricao: " Booster Box ",
        });

        expect(resultado.id).toBeDefined();
        expect(resultado.nome).toBe("Campeonato Legacy");
        expect(resultado.formato).toBe("legacy");
        expect(resultado.donoId).toBe("user-1");
        expect(resultado.status).toBe("inscricoes_abertas");
        expect(resultado.descricao).toBe("Booster Box");
        expect(resultado.criadoEm).toBeInstanceOf(Date);
        expect(gateway.salvar).toHaveBeenCalledTimes(1);
    });

    it("deve criar torneio sem prêmio", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        const resultado = await uc.executar({
            nome: "Torneio Simples",
            horario: new Date(),
            formato: "standard",
            donoId: "user-1",
        });

        expect(resultado.descricao).toBeUndefined();
    });

    it("deve criar torneio com todos os campos opcionais", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        const resultado = await uc.executar({
            nome: "Grand Prix",
            horario: new Date("2025-09-01T10:00:00Z"),
            formato: "Modern",
            donoId: "user-1",
            bannerUrl: " https://cdn.example.com/banner.png ",
            linkBanner: " https://evento.example.com ",
            somRodada: " round-start.mp3 ",
            maxJogadores: 64,
            maxRodadas: 6,
            corteTop: 8,
            linkLive: " https://youtube.com/live/abc ",
        });

        expect(resultado.bannerUrl).toBe("https://cdn.example.com/banner.png");
        expect(resultado.linkBanner).toBe("https://evento.example.com");
        expect(resultado.somRodada).toBe("round-start.mp3");
        expect(resultado.maxJogadores).toBe(64);
        expect(resultado.maxRodadas).toBe(6);
        expect(resultado.corteTop).toBe(8);
        expect(resultado.linkLive).toBe("https://youtube.com/live/abc");
    });

    it("deve criar torneio secreto quando secreto=true", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        const resultado = await uc.executar({
            nome: "Torneio Privado",
            horario: new Date(),
            formato: "vintage",
            donoId: "user-1",
            secreto: true,
        });

        expect(resultado.secreto).toBe(true);
    });

    it("deve ter secreto=false por padrão", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        const resultado = await uc.executar({
            nome: "Torneio Normal",
            horario: new Date(),
            formato: "standard",
            donoId: "user-1",
        });

        expect(resultado.secreto).toBe(false);
    });

    it("deve lançar 400 se corteTop não for potência de 2", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        await expect(
            uc.executar({
                nome: "Torneio Corte Invalido",
                horario: new Date(),
                formato: "legacy",
                donoId: "user-1",
                corteTop: 6,
            })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve aceitar corteTop com potências de 2 válidas (2, 4, 8, 16)", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        for (const corteTop of [2, 4, 8, 16]) {
            const resultado = await uc.executar({
                nome: `Torneio Top ${corteTop}`,
                horario: new Date(),
                formato: "legacy",
                donoId: "user-1",
                corteTop,
            });
            expect(resultado.corteTop).toBe(corteTop);
        }
    });

    it("deve lançar 400 se corteTop for 0", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        await expect(
            uc.executar({
                nome: "Torneio", horario: new Date(), formato: "legacy",
                donoId: "user-1", corteTop: 0,
            })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se corteTop for 1", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        await expect(
            uc.executar({
                nome: "Torneio", horario: new Date(), formato: "legacy",
                donoId: "user-1", corteTop: 1,
            })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se corteTop for 32", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        await expect(
            uc.executar({
                nome: "Torneio", horario: new Date(), formato: "legacy",
                donoId: "user-1", corteTop: 32,
            })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve aplicar trim no nome e formato", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        const resultado = await uc.executar({
            nome: "   Torneio com Espaços   ",
            horario: new Date(),
            formato: "  MODERN  ",
            donoId: "user-1",
        });

        expect(resultado.nome).toBe("Torneio com Espaços");
        expect(resultado.formato).toBe("modern");
    });

    it("deve aceitar torneio sem campos opcionais (nenhum campo opcional)", async () => {
        const gateway = criarMockTorneioGateway();
        const uc = CriarTorneio.criar(gateway);

        const resultado = await uc.executar({
            nome: "Torneio Básico",
            horario: new Date(),
            formato: "standard",
            donoId: "user-1",
        });

        expect(resultado.corteTop).toBeUndefined();
        expect(resultado.maxRodadas).toBeUndefined();
        expect(resultado.maxJogadores).toBeUndefined();
        expect(resultado.bannerUrl).toBeUndefined();
        expect(resultado.somRodada).toBeUndefined();
        expect(resultado.linkLive).toBeUndefined();
        expect(resultado.linkBanner).toBeUndefined();
    });
});
