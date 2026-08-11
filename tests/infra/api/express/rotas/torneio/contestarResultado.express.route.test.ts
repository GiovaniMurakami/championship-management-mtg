import { ContestarResultadoRota } from "../../../../../../src/infra/api/express/rotas/torneio/contestarResultado.express.route";
import { eventosTorneio } from "../../../../../../src/infra/socketio/eventosTorneio";

describe("ContestarResultadoRota", () => {
    it("repassa observação e emite resultado_contestado", async () => {
        const resultado = {
            id: "550e8400-e29b-41d4-a716-446655440001",
            torneioId: "550e8400-e29b-41d4-a716-446655440000",
            rodada: 2,
            jogador1Id: "u-1",
            jogador2Id: "u-2",
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
            status: "finalizada",
            contestado: true,
            observacaoContestacao: "Resultado digitado errado",
        };

        const servico = {
            executar: jest.fn().mockResolvedValue(resultado),
        } as any;

        const rota = ContestarResultadoRota.criar(servico);
        const emitSpy = jest.spyOn(eventosTorneio, "emit");

        const request = {
            usuario: { id: "u-1", role: "user" },
            params: { partidaId: resultado.id },
            body: { observacao: "Resultado digitado errado" },
        } as any;

        const response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as any;

        await rota.getHandler()(request, response, jest.fn());

        expect(servico.executar).toHaveBeenCalledWith({
            partidaId: resultado.id,
            usuarioId: "u-1",
            isAdmin: false,
            observacao: "Resultado digitado errado",
        });
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(resultado);
        expect(emitSpy).toHaveBeenCalledWith("resultado_contestado", resultado);

        emitSpy.mockRestore();
    });
});
