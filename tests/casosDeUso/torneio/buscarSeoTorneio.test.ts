import { BuscarSeoTorneio, sanitizarDescricaoSeo, detectarImageType } from "../../../src/casosDeUso/torneio/buscarSeoTorneio";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { criarMockTorneioGateway } from "../../mocks/gateways";

describe("BuscarSeoTorneio", () => {
    it("deve retornar titulo e imagem do torneio", async () => {
        const torneio = new Torneio({
            id: "t-1",
            nome: "Pauper Semanal",
            horario: new Date(),
            formato: "pauper",
            donoId: "u-1",
            status: "inscricoes_abertas",
            rodadaAtual: 0,
            totalRodadas: 0,
            bannerUrl: " https://cdn.example.com/banner.png ",
            descricao: " Torneio teste ",
            linkBanner: " https://site.example.com/torneio ",
        });
        const uc = BuscarSeoTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) })
        );

        const resultado = await uc.executar({ torneioId: "t-1" });

        expect(resultado).toEqual({
            torneioId: "t-1",
            title: "Pauper Semanal",
            image: "https://cdn.example.com/banner.png",
            imageType: "image/png",
            description: "Torneio teste",
            url: "https://site.example.com/torneio",
        });
    });

    it("deve sanitizar description com quebras de linha e truncar", async () => {
        const descricaoLonga = `Descrição\nTaxa FREE\n\n${"x".repeat(250)}`;
        const torneio = new Torneio({
            id: "t-1",
            nome: "Legacy",
            horario: new Date(),
            formato: "legacy",
            donoId: "u-1",
            status: "inscricoes_abertas",
            rodadaAtual: 0,
            totalRodadas: 0,
            bannerUrl: "https://cdn.example.com/banner.jpg",
            descricao: descricaoLonga,
        });
        const uc = BuscarSeoTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) })
        );

        const resultado = await uc.executar({ torneioId: "t-1" });

        expect(resultado.description).not.toMatch(/\n/);
        expect(resultado.description!.length).toBeLessThanOrEqual(200);
        expect(resultado.imageType).toBe("image/jpeg");
    });

    it("deve retornar null para campos opcionais ausentes", async () => {
        const torneio = new Torneio({
            id: "t-1",
            nome: "Legacy",
            horario: new Date(),
            formato: "legacy",
            donoId: "u-1",
            status: "inscricoes_abertas",
            rodadaAtual: 0,
            totalRodadas: 0,
        });
        const uc = BuscarSeoTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) })
        );

        const resultado = await uc.executar({ torneioId: "t-1" });

        expect(resultado.title).toBe("Legacy");
        expect(resultado.image).toBeNull();
        expect(resultado.imageType).toBeNull();
        expect(resultado.description).toBeNull();
        expect(resultado.url).toBeNull();
    });

    it("deve lancar 404 quando torneio nao existe", async () => {
        const uc = BuscarSeoTorneio.criar(criarMockTorneioGateway());

        await expect(uc.executar({ torneioId: "x" })).rejects.toMatchObject({ status: 404 });
    });
});

describe("sanitizarDescricaoSeo / detectarImageType", () => {
    it("colapsa whitespace", () => {
        expect(sanitizarDescricaoSeo("  a\n\nb  ")).toBe("a b");
    });

    it("detecta mime pela extensao", () => {
        expect(detectarImageType("https://x/y.webp?v=1")).toBe("image/webp");
        expect(detectarImageType(null)).toBeNull();
    });
});
