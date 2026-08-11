import { EncerrarTorneioRota } from "../../../../../../src/infra/api/express/rotas/torneio/encerrarTorneio.express.route";
import { eventosTorneio } from "../../../../../../src/infra/socketio/eventosTorneio";

describe("EncerrarTorneioRota", () => {
    it("emite torneio_finalizado ao encerrar", async () => {
        const resultado = {
            torneioId: "550e8400-e29b-41d4-a716-446655440000",
            status: "finalizado",
            rodadaAtual: 3,
            totalRodadas: 3,
            finalizado: true as const,
        };

        const servico = {
            executar: jest.fn().mockResolvedValue(resultado),
        } as any;

        const rota = EncerrarTorneioRota.criar(servico);
        const emitSpy = jest.spyOn(eventosTorneio, "emit");

        const request = {
            usuario: { id: "admin-1", role: "admin" },
            params: { torneioId: resultado.torneioId },
            body: {},
        } as any;

        const response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as any;

        await rota.getHandler()(request, response, jest.fn());

        expect(servico.executar).toHaveBeenCalledWith({
            torneioId: resultado.torneioId,
            usuarioId: "admin-1",
            isAdmin: true,
        });
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(resultado);
        expect(emitSpy).toHaveBeenCalledWith("torneio_finalizado", resultado);

        emitSpy.mockRestore();
    });
});
