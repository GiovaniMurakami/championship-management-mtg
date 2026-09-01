import { CheckInTorneio } from "../../../src/casosDeUso/torneio/checkInTorneio";
import { criarMockTorneioGateway, criarMockInscricaoGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { eventosTorneio } from "../../../src/infra/socketio/eventosTorneio";

jest.mock("../../../src/infra/socketio/eventosTorneio", () => ({
    eventosTorneio: { emit: jest.fn() },
}));

const usuarioPadrao = new Usuario({
    id: "u-1", nome: "Joao", email: "j@e.com", senha: "s",
    nickMTGO: "joao_mtgo", nickArena: "joao#1234",
});

function criarUc(
    torneio: Torneio,
    inscricao?: Inscricao | null,
    usuario: Usuario | null = usuarioPadrao,
) {
    return CheckInTorneio.criar(
        criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
        criarMockInscricaoGateway(
            inscricao === undefined
                ? {}
                : { buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao) },
        ),
        criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
    );
}

describe("CheckInTorneio", () => {
    beforeEach(() => {
        (eventosTorneio.emit as jest.Mock).mockClear();
    });

    it("deve realizar check-in inicial quando dentro da janela de 1h", async () => {
        const agora = new Date();
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(agora.getTime() + 30 * 60 * 1000), formato: "f",
            donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkInRodada: -1, dropped: false, byeCount: 0,
        });
        const inscricaoGw = criarMockInscricaoGateway({
            buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao),
        });
        const uc = CheckInTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            inscricaoGw,
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuarioPadrao) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", usuarioId: "u-1" });

        expect(resultado.checkInRodada).toBe(0);
        expect(resultado.usuario).toEqual({ id: "u-1", nome: "Joao" });
        expect(inscricaoGw.atualizar).toHaveBeenCalledTimes(1);
        expect(eventosTorneio.emit).toHaveBeenCalledWith(
            "checkin_realizado",
            expect.objectContaining({ usuarioId: "u-1", usuarioNome: "Joao" }),
        );
    });

    it("emite checkin com nick MOL quando o torneio usa nickMOL", async () => {
        const agora = new Date();
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(agora.getTime() + 30 * 60 * 1000), formato: "f",
            donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
            exibirNomeJogador: "nickMOL",
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkInRodada: -1, dropped: false, byeCount: 0,
        });

        const resultado = await criarUc(torneio, inscricao).executar({ torneioId: "t-1", usuarioId: "u-1" });

        expect(resultado.usuario.nome).toBe("joao_mtgo");
        expect(eventosTorneio.emit).toHaveBeenCalledWith(
            "checkin_realizado",
            expect.objectContaining({ usuarioNome: "joao_mtgo" }),
        );
    });

    it("deve lancar erro se check-in antes de 1h do torneio", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(Date.now() + 3 * 60 * 60 * 1000), formato: "f",
            donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkInRodada: -1, dropped: false, byeCount: 0,
        });

        await expect(
            criarUc(torneio, inscricao).executar({ torneioId: "t-1", usuarioId: "u-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve realizar check-in entre rodadas (em_andamento)", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "d", status: "em_andamento", rodadaAtual: 2, totalRodadas: 3,
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkInRodada: 1, dropped: false, byeCount: 0,
        });

        const resultado = await criarUc(torneio, inscricao).executar({ torneioId: "t-1", usuarioId: "u-1" });
        expect(resultado.checkInRodada).toBe(2);
    });

    it("deve lancar erro se torneio ja finalizado", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "d", status: "finalizado", rodadaAtual: 3, totalRodadas: 3,
        });

        await expect(
            criarUc(torneio).executar({ torneioId: "t-1", usuarioId: "u-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lancar erro se nao estiver inscrito", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
        });

        await expect(
            criarUc(torneio, null).executar({ torneioId: "t-1", usuarioId: "u-1" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve permitir check-in entre rodadas sem check-in inicial", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "d", status: "em_andamento", rodadaAtual: 2, totalRodadas: 3,
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkInRodada: -1, dropped: false, byeCount: 0,
        });

        await expect(
            criarUc(torneio, inscricao).executar({ torneioId: "t-1", usuarioId: "u-1" })
        ).resolves.toMatchObject({ checkInRodada: 2 });
    });

    it("deve retornar sucesso idempotente se ja realizou check-in inicial", async () => {
        const agora = new Date();
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(agora.getTime() + 30 * 60 * 1000), formato: "f",
            donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0,
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkInRodada: 0, dropped: false, byeCount: 0,
        });
        const inscricaoGw = criarMockInscricaoGateway({
            buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao),
        });
        const uc = CheckInTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            inscricaoGw,
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuarioPadrao) }),
        );

        await expect(uc.executar({ torneioId: "t-1", usuarioId: "u-1" }))
            .resolves.toMatchObject({ checkInRodada: 0 });
        expect(inscricaoGw.atualizar).not.toHaveBeenCalled();
        expect(eventosTorneio.emit).not.toHaveBeenCalled();
    });

    it("deve retornar sucesso idempotente se ja fez check-in para a rodada atual", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "d", status: "em_andamento", rodadaAtual: 2, totalRodadas: 3,
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkInRodada: 2, dropped: false, byeCount: 0,
        });
        const inscricaoGw = criarMockInscricaoGateway({
            buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(inscricao),
        });
        const uc = CheckInTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            inscricaoGw,
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuarioPadrao) }),
        );

        await expect(uc.executar({ torneioId: "t-1", usuarioId: "u-1" }))
            .resolves.toMatchObject({ checkInRodada: 2 });
        expect(inscricaoGw.atualizar).not.toHaveBeenCalled();
        expect(eventosTorneio.emit).not.toHaveBeenCalled();
    });

    it("deve setar checkInRodada igual a rodadaAtual (independente do valor anterior)", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "d", status: "em_andamento", rodadaAtual: 3, totalRodadas: 4,
        });
        const inscricao = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-1",
            checkInRodada: 1, dropped: false, byeCount: 0,
        });

        const resultado = await criarUc(torneio, inscricao).executar({ torneioId: "t-1", usuarioId: "u-1" });
        expect(resultado.checkInRodada).toBe(3);
    });

    it("usa usuarioNome ou usuarioId quando o usuário não é encontrado", async () => {
        const torneio = new Torneio({
            id: "t-1", nome: "T", horario: new Date(), formato: "f",
            donoId: "d", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
        });
        const insc1 = new Inscricao({
            id: "i-1", torneioId: "t-1", usuarioId: "u-ghost",
            checkInRodada: -1, dropped: false, byeCount: 0,
        });
        const insc2 = new Inscricao({
            id: "i-2", torneioId: "t-1", usuarioId: "u-ghost",
            checkInRodada: -1, dropped: false, byeCount: 0,
        });

        const comFallback = await criarUc(torneio, insc1, null).executar({
            torneioId: "t-1",
            usuarioId: "u-ghost",
            usuarioNome: "Nome Fallback",
        });
        expect(comFallback.usuario.nome).toBe("Nome Fallback");

        const soId = await criarUc(torneio, insc2, null).executar({
            torneioId: "t-1",
            usuarioId: "u-ghost",
        });
        expect(soId.usuario.nome).toBe("u-ghost");
    });

    it("retorna 404 se torneio não existe", async () => {
        const uc = CheckInTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(null) }),
            criarMockInscricaoGateway(),
            criarMockUsuarioGateway(),
        );
        await expect(
            uc.executar({ torneioId: "x", usuarioId: "u-1" }),
        ).rejects.toMatchObject({ status: 404 });
    });
});
