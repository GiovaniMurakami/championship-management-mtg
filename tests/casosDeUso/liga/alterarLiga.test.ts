import { AlterarLiga } from "../../../src/casosDeUso/liga/alterarLiga";
import { criarMockLigaGateway, criarMockTorneioGateway } from "../../mocks/gateways";
import { Liga } from "../../../src/dominio/entidade/liga";
import { Torneio } from "../../../src/dominio/entidade/torneio";

describe("AlterarLiga", () => {
    const ligaExistente = new Liga({
        id: "liga-1",
        nome: "Liga Nacional",
        donoId: "user-1",
        torneioIds: [],
    });

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

    it("deve alterar nome e descrição da liga", async () => {
        const ligaGateway = criarMockLigaGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...ligaExistente, torneioIds: [] }),
        });
        const torneioGateway = criarMockTorneioGateway();
        const uc = AlterarLiga.criar(ligaGateway, torneioGateway);

        const resultado = await uc.executar({
            id: "liga-1",
            requisitanteId: "user-1",
            isAdmin: false,
            nome: "  Liga Internacional  ",
            descricao: "Nova descrição",
        });

        expect(resultado.nome).toBe("Liga Internacional");
        expect(resultado.descricao).toBe("Nova descrição");
        expect(ligaGateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve adicionar torneios válidos à liga", async () => {
        const ligaGateway = criarMockLigaGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...ligaExistente, torneioIds: [] }),
        });
        const torneioGateway = criarMockTorneioGateway({
            buscarPorId: jest.fn().mockResolvedValue(torneioExistente),
        });
        const uc = AlterarLiga.criar(ligaGateway, torneioGateway);

        const resultado = await uc.executar({
            id: "liga-1",
            requisitanteId: "user-1",
            isAdmin: false,
            torneioIds: ["torneio-1"],
        });

        expect(resultado.torneioIds).toEqual(["torneio-1"]);
    });

    it("deve lançar 404 se liga não existir", async () => {
        const ligaGateway = criarMockLigaGateway();
        const torneioGateway = criarMockTorneioGateway();
        const uc = AlterarLiga.criar(ligaGateway, torneioGateway);

        await expect(
            uc.executar({ id: "inexistente", requisitanteId: "user-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 403 se não for dono nem admin", async () => {
        const ligaGateway = criarMockLigaGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...ligaExistente, torneioIds: [] }),
        });
        const torneioGateway = criarMockTorneioGateway();
        const uc = AlterarLiga.criar(ligaGateway, torneioGateway);

        await expect(
            uc.executar({ id: "liga-1", requisitanteId: "outro-user", isAdmin: false })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode alterar liga de outro usuário", async () => {
        const ligaGateway = criarMockLigaGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...ligaExistente, torneioIds: [] }),
        });
        const torneioGateway = criarMockTorneioGateway();
        const uc = AlterarLiga.criar(ligaGateway, torneioGateway);

        const resultado = await uc.executar({
            id: "liga-1",
            requisitanteId: "admin-id",
            isAdmin: true,
            nome: "Alterada pelo Admin",
        });

        expect(resultado.nome).toBe("Alterada pelo Admin");
    });

    it("deve lançar 404 se um torneio da nova lista não existir", async () => {
        const ligaGateway = criarMockLigaGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...ligaExistente, torneioIds: [] }),
        });
        const torneioGateway = criarMockTorneioGateway();
        const uc = AlterarLiga.criar(ligaGateway, torneioGateway);

        await expect(
            uc.executar({ id: "liga-1", requisitanteId: "user-1", isAdmin: false, torneioIds: ["torneio-inexistente"] })
        ).rejects.toMatchObject({ status: 404 });

        expect(ligaGateway.atualizar).not.toHaveBeenCalled();
    });

    it("deve atualizar e remover o banner da liga", async () => {
        const liga = new Liga({ id: "liga-1", nome: "Liga", donoId: "user-1", bannerUrl: "https://bucket/antigo.jpg" });
        const ligaGateway = criarMockLigaGateway({ buscarPorId: jest.fn().mockResolvedValue(liga) });
        const uc = AlterarLiga.criar(ligaGateway, criarMockTorneioGateway());
        const atualizado = await uc.executar({ id: "liga-1", requisitanteId: "user-1", isAdmin: false, bannerUrl: " https://bucket/novo.jpg " });
        expect(atualizado.bannerUrl).toBe("https://bucket/novo.jpg");
        const removido = await uc.executar({ id: "liga-1", requisitanteId: "user-1", isAdmin: false, bannerUrl: "" });
        expect(removido.bannerUrl).toBeUndefined();
        expect(ligaGateway.atualizar).toHaveBeenLastCalledWith(expect.objectContaining({ bannerUrl: undefined }));
    });
});
