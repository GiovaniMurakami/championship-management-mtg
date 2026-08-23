import { CriarLiga } from "../../../src/casosDeUso/liga/criarLiga";
import { criarMockLigaGateway, criarMockTorneioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";

describe("CriarLiga", () => {
    const torneioExistente = new Torneio({
        id: "torneio-1",
        nome: "GP SP",
        horario: new Date(),
        formato: "modern",
        donoId: "user-1",
        status: "inscricoes_abertas",
        rodadaAtual: 0,
        totalRodadas: 0,
        emCorte: false,
    });

    it("deve criar uma liga sem torneios", async () => {
        const ligaGateway = criarMockLigaGateway();
        const torneioGateway = criarMockTorneioGateway();
        const uc = CriarLiga.criar(ligaGateway, torneioGateway);

        const resultado = await uc.executar({
            nome: "  Liga Nacional  ",
            donoId: "user-1",
        });

        expect(resultado.nome).toBe("Liga Nacional");
        expect(resultado.donoId).toBe("user-1");
        expect(resultado.torneioIds).toEqual([]);
        expect(resultado.id).toBeDefined();
        expect(ligaGateway.salvar).toHaveBeenCalledTimes(1);
    });

    it("deve criar uma liga com torneios válidos", async () => {
        const ligaGateway = criarMockLigaGateway();
        const torneioGateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioExistente),
        });
        const uc = CriarLiga.criar(ligaGateway, torneioGateway);

        const resultado = await uc.executar({
            nome: "Liga Nacional",
            donoId: "user-1",
            descricao: "Liga de torneios de Modern",
            torneioIds: ["torneio-1"],
        });

        expect(resultado.torneioIds).toEqual(["torneio-1"]);
        expect(resultado.descricao).toBe("Liga de torneios de Modern");
    });

    it("deve lançar 404 se um torneio da lista não existir", async () => {
        const ligaGateway = criarMockLigaGateway();
        const torneioGateway = criarMockTorneioGateway();
        const uc = CriarLiga.criar(ligaGateway, torneioGateway);

        await expect(
            uc.executar({ nome: "Liga", donoId: "user-1", torneioIds: ["torneio-inexistente"] })
        ).rejects.toMatchObject({ status: 404 });

        expect(ligaGateway.salvar).not.toHaveBeenCalled();
    });

    it("deve criar e persistir uma liga com banner opcional", async () => {
        const ligaGateway = criarMockLigaGateway();
        const uc = CriarLiga.criar(ligaGateway, criarMockTorneioGateway());
        const resultado = await uc.executar({ nome: "Liga com banner", donoId: "user-1", bannerUrl: " https://bucket.s3.us-east-1.amazonaws.com/ligas/banner.webp " });
        expect(resultado.bannerUrl).toBe("https://bucket.s3.us-east-1.amazonaws.com/ligas/banner.webp");
        expect(ligaGateway.salvar).toHaveBeenCalledWith(expect.objectContaining({ bannerUrl: resultado.bannerUrl }));
    });
});
