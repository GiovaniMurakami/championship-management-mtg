import { IniciarProximaRodadaRota } from "../../../../../../src/infra/api/express/rotas/torneio/iniciarProximaRodada.express.route";
import { eventosTorneio } from "../../../../../../src/infra/socketio/eventosTorneio";

describe("IniciarProximaRodadaRota", () => {
    const torneioId = "550e8400-e29b-41d4-a716-446655440000";

    function criarHandler(resultado: Record<string, unknown>) {
        const servico = {
            executar: jest.fn().mockResolvedValue(resultado),
        } as any;
        const rota = IniciarProximaRodadaRota.criar(servico);
        return { servico, handler: rota.getHandler() };
    }

    async function executar(handler: ReturnType<IniciarProximaRodadaRota["getHandler"]>) {
        const request = {
            usuario: { id: "dono-1", role: "user" },
            params: { torneioId },
            body: {},
        } as any;
        const response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as any;
        await handler(request, response, jest.fn());
        return response;
    }

    it("emite rodada_iniciada e nao emite checkin_rodada_aberto", async () => {
        const resultado = {
            finalizado: false,
            rodadaAtual: 2,
            totalRodadas: 4,
            emCorte: false,
            rodadaIniciadaEm: "2026-08-15T10:00:00",
            partidas: [{ jogador1Id: "u-1", jogador2Id: "u-2" }],
        };
        const { handler } = criarHandler(resultado);
        const emitSpy = jest.spyOn(eventosTorneio, "emit");

        await executar(handler);

        expect(emitSpy).toHaveBeenCalledWith("rodada_iniciada", expect.objectContaining({
            torneioId,
            rodadaAtual: 2,
        }));
        expect(emitSpy).not.toHaveBeenCalledWith(
            "checkin_rodada_aberto",
            expect.anything(),
        );

        emitSpy.mockRestore();
    });

    it("emite corte_iniciado quando a rodada entra em corte", async () => {
        const resultado = {
            finalizado: false,
            rodadaAtual: 5,
            totalRodadas: 4,
            emCorte: true,
            rodadaIniciadaEm: "2026-08-15T10:00:00",
            partidas: [{
                jogador1Id: "u-1",
                jogador1Nome: "A",
                jogador2Id: "u-2",
                jogador2Nome: "B",
            }],
        };
        const { handler } = criarHandler(resultado);
        const emitSpy = jest.spyOn(eventosTorneio, "emit");

        await executar(handler);

        expect(emitSpy).toHaveBeenCalledWith("corte_iniciado", expect.objectContaining({
            torneioId,
            rodadaAtual: 5,
        }));
        expect(emitSpy).not.toHaveBeenCalledWith(
            "checkin_rodada_aberto",
            expect.anything(),
        );

        emitSpy.mockRestore();
    });
});
