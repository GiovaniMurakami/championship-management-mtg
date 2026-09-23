import { AjustarTotalRodadasRota } from "../../../../../../src/infra/api/express/rotas/torneio/ajustarTotalRodadas.express.route";
import { eventosTorneio } from "../../../../../../src/infra/socketio/eventosTorneio";

describe("AjustarTotalRodadasRota", () => {
    it("emite total_rodadas_alterado ao ajustar", async () => {
        const resultado = {
            torneioId: "550e8400-e29b-41d4-a716-446655440000",
            rodadaAtual: 2,
            totalRodadasAnterior: 4,
            totalRodadas: 5,
            emCorte: false,
        };

        const servico = {
            executar: vi.fn().mockResolvedValue(resultado),
        } as any;

        const rota = AjustarTotalRodadasRota.criar(servico);
        const emitSpy = vi.spyOn(eventosTorneio, "emit");

        const request = {
            usuario: { id: "dono-1", role: "user" },
            params: { torneioId: resultado.torneioId },
            body: { totalRodadas: 5 },
        } as any;

        const response = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;

        await rota.getHandler()(request, response, vi.fn());

        expect(servico.executar).toHaveBeenCalledWith({
            torneioId: resultado.torneioId,
            usuarioId: "dono-1",
            isAdmin: false,
            totalRodadas: 5,
        });
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(resultado);
        expect(emitSpy).toHaveBeenCalledWith("total_rodadas_alterado", resultado);

        emitSpy.mockRestore();
    });
});
