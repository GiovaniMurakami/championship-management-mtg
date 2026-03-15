import { RegistrarResultadoRota } from "../../../../../../src/infra/api/express/rotas/torneio/registrarResultado.express.route";
import { eventosTorneio } from "../../../../../../src/infra/socketio/eventosTorneio";

describe("RegistrarResultadoRota", () => {
    it("deve emitir resultado_registrado e mesa_atualizada ao registrar resultado", async () => {
        const resultado = {
            id: "p-1",
            torneioId: "t-1",
            rodada: 2,
            jogador1Id: "u-1",
            jogador2Id: "u-2",
            deckJogador1Id: "d-1",
            deckJogador2Id: "d-2",
            vitoriasJogador1: 2,
            vitoriasJogador2: 1,
            status: "finalizada",
        };

        const registrarResultadoServico = {
            executar: jest.fn().mockResolvedValue(resultado),
        } as any;

        const buscarStandingsServico = {
            executar: jest.fn().mockResolvedValue({ torneioId: "t-1", standings: [] }),
        } as any;

        const rota = RegistrarResultadoRota.criar(
            registrarResultadoServico,
            buscarStandingsServico
        );

        const emitSpy = jest.spyOn(eventosTorneio, "emit");

        const request = {
            usuario: { id: "u-1" },
            params: { partidaId: "p-1" },
            body: { vitoriasJogador1: 2, vitoriasJogador2: 1 },
        } as any;

        const response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as any;

        const next = jest.fn();

        await rota.getHandler()(request, response, next);
        await new Promise((resolve) => setImmediate(resolve));

        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(resultado);

        expect(emitSpy).toHaveBeenCalledWith("resultado_registrado", resultado);
        expect(emitSpy).toHaveBeenCalledWith(
            "mesa_atualizada",
            expect.objectContaining({
                torneioId: "t-1",
                rodada: 2,
                partidaId: "p-1",
                partida: resultado,
            })
        );

        emitSpy.mockRestore();
    });
});
