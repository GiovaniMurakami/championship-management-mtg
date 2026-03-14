import { InscreverTorneio } from "../../../src/casosDeUso/torneio/inscreverTorneio";
import { criarMockTorneioGateway, criarMockInscricaoGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Usuario } from "../../../src/dominio/entidade/usuario";

// Mock do eventosTorneio para evitar side effects nos testes
jest.mock("../../../src/infra/socketio/eventosTorneio", () => ({
    eventosTorneio: { emit: jest.fn() },
}));

describe("InscreverTorneio", () => {
    const torneioAberto = new Torneio({
        id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
        donoId: "dono", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
    });

    const torneioEmAndamento = new Torneio({
        id: "t-2", nome: "Torneio 2", horario: new Date(), formato: "modern",
        donoId: "dono", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
    });

    it("deve inscrever um jogador com sucesso", async () => {
        const uc = InscreverTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioAberto) }),
            criarMockInscricaoGateway(),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" })) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", usuarioId: "u-1" });

        expect(resultado.torneioId).toBe("t-1");
        expect(resultado.usuarioId).toBe("u-1");
        expect(resultado.checkIn).toBe(false);
    });

    it("deve lançar erro se o torneio não for encontrado", async () => {
        const uc = InscreverTorneio.criar(
            criarMockTorneioGateway(),
            criarMockInscricaoGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "inexistente", usuarioId: "u" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se as inscrições estiverem encerradas", async () => {
        const uc = InscreverTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmAndamento) }),
            criarMockInscricaoGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-2", usuarioId: "u" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se o jogador já estiver inscrito", async () => {
        const inscricaoExistente = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkIn: false, checkInRodada: -1, dropped: false,
        });

        const uc = InscreverTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioAberto) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricaoExistente) }),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", usuarioId: "u-1" })
        ).rejects.toMatchObject({ status: 400 });
    });
});
