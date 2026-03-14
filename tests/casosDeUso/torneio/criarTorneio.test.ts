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
});
