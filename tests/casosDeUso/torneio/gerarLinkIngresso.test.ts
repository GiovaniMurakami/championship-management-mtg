import { GerarLinkIngresso } from "../../../src/casosDeUso/torneio/gerarLinkIngresso";
import { criarMockTorneioGateway, criarMockLinkIngressoGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";

describe("GerarLinkIngresso", () => {
    const torneio = new Torneio({
        id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
        donoId: "dono-1", status: "em_andamento", rodadaAtual: 2, totalRodadas: 4,
    });

    it("deve gerar um link de ingresso com token e expiração", async () => {
        const linkGw = criarMockLinkIngressoGateway({ salvar: jest.fn() });
        const uc = GerarLinkIngresso.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            linkGw,
        );

        const resultado = await uc.executar({ torneioId: "t-1", requisitanteId: "dono-1", isAdmin: false });

        expect(resultado.token).toBeDefined();
        expect(resultado.torneioId).toBe("t-1");
        expect(resultado.expiresAt).toBeInstanceOf(Date);
        expect(resultado.expiresAt.getTime()).toBeGreaterThan(Date.now());
        expect(linkGw.salvar).toHaveBeenCalledTimes(1);
    });

    it("deve respeitar a validade customizada em horas", async () => {
        const agora = Date.now();
        const uc = GerarLinkIngresso.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockLinkIngressoGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-1", requisitanteId: "dono-1", isAdmin: false, validadeHoras: 2 });

        const diffHoras = (resultado.expiresAt.getTime() - agora) / (1000 * 60 * 60);
        expect(diffHoras).toBeCloseTo(2, 0);
    });

    it("deve lançar 404 se o torneio não existir", async () => {
        const uc = GerarLinkIngresso.criar(
            criarMockTorneioGateway(),
            criarMockLinkIngressoGateway(),
        );

        await expect(
            uc.executar({ torneioId: "x", requisitanteId: "dono-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 400 se o torneio não estiver em andamento", async () => {
        const torneioAberto = new Torneio({ ...torneio, status: "inscricoes_abertas" });

        const uc = GerarLinkIngresso.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioAberto) }),
            criarMockLinkIngressoGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", requisitanteId: "dono-1", isAdmin: false })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 403 se não for dono nem admin", async () => {
        const uc = GerarLinkIngresso.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockLinkIngressoGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", requisitanteId: "outro", isAdmin: false })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("admin pode gerar link para qualquer torneio", async () => {
        const uc = GerarLinkIngresso.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockLinkIngressoGateway(),
        );

        const resultado = await uc.executar({ torneioId: "t-1", requisitanteId: "admin-qualquer", isAdmin: true });

        expect(resultado.token).toBeDefined();
    });
});
