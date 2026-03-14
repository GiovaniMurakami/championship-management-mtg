import { CheckInTorneio } from "../../../src/casosDeUso/torneio/checkInTorneio";
import { criarMockTorneioGateway, criarMockInscricaoGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";

jest.mock("../../../src/infra/socketio/eventosTorneio", () => ({
    eventosTorneio: { emit: jest.fn() },
}));

describe("CheckInTorneio", () => {
    it("deve realizar check-in inicial quando dentro da janela de 1h", async () => {
        const agora = new Date();
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(agora.getTime() + 30 * 60 * 1000), formato: "f",
            donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkIn: false, checkInRodada: -1, dropped: false,
        });

        const inscricaoGw = criarMockInscricaoGateway({
            buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao),
        });
        const uc = CheckInTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            inscricaoGw,
        );

        const resultado = await uc.executar({ torneioId: "t-1", usuarioId: "u-1" });

        expect(resultado.checkIn).toBe(true);
        expect(resultado.checkInRodada).toBe(0);
        expect(inscricaoGw.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se check-in antes de 1h do torneio", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(Date.now() + 3 * 60 * 60 * 1000), formato: "f",
            donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkIn: false, checkInRodada: -1, dropped: false,
        });

        const uc = CheckInTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao) }),
        );

        await expect(
            uc.executar({ torneioId: "t-1", usuarioId: "u-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve realizar check-in entre rodadas (em_andamento)", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "d", status: "em_andamento", rodadaAtual: 2, totalRodadas: 3,
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkIn: true, checkInRodada: 1, dropped: false,
        });

        const uc = CheckInTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", usuarioId: "u-1" });
        expect(resultado.checkInRodada).toBe(2);
    });

    it("deve lançar erro se torneio já finalizado", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "d", status: "finalizado", rodadaAtual: 3, totalRodadas: 3,
        });

        const uc = CheckInTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", usuarioId: "u-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro se não estiver inscrito", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
        });

        const uc = CheckInTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway(),
        );

        await expect(
            uc.executar({ torneioId: "t-1", usuarioId: "u-1" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro no check-in entre rodadas sem check-in inicial", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "d", status: "em_andamento", rodadaAtual: 2, totalRodadas: 3,
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkIn: false, checkInRodada: -1, dropped: false,
        });

        const uc = CheckInTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao) }),
        );

        await expect(
            uc.executar({ torneioId: "t-1", usuarioId: "u-1" })
        ).rejects.toMatchObject({ status: 400 });
    });
});
