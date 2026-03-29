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
            premio: " Booster Box ",
        });

        expect(resultado.id).toBeDefined();
        expect(resultado.nome).toBe("Campeonato Legacy");
        expect(resultado.formato).toBe("legacy");
        expect(resultado.donoId).toBe("user-1");
        expect(resultado.status).toBe("inscricoes_abertas");
        expect(resultado.premio).toBe("Booster Box");
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

        expect(resultado.premio).toBeUndefined();
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
});
