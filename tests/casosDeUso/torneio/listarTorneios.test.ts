import { ListarTorneios } from "../../../src/casosDeUso/torneio/listarTorneios";
import { criarMockTorneioGateway, criarMockInscricaoGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";

describe("ListarTorneios", () => {
    const torneios = [
        new Torneio({ id: "t1", nome: "T1", horario: new Date(), formato: "legacy", donoId: "u1", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0 }),
        new Torneio({ id: "t2", nome: "T2", horario: new Date(), formato: "modern", donoId: "u1", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3 }),
    ];

    it("deve retornar lista de torneios com inscrito=true quando inscrito", async () => {
        const inscricao = new Inscricao({ id: "i1", torneioId: "t1", usuarioId: "u2", checkInRodada: -1, dropped: false, criadoEm: new Date() });
        const torneioGateway = criarMockTorneioGateway({
            listar: jest.fn().mockResolvedValue(torneios),
            listarTotal: jest.fn().mockResolvedValue(2),
        });
        const inscricaoGateway = criarMockInscricaoGateway({
            listarPorUsuario: jest.fn().mockResolvedValue([inscricao]),
            contarPorTorneios: jest.fn().mockResolvedValue({ t1: 3, t2: 5 }),
        });
        const uc = ListarTorneios.criar(torneioGateway, inscricaoGateway);

        const resultado = await uc.executar({ usuarioId: "u2" });

        expect(resultado.torneios).toHaveLength(2);
        expect(resultado.torneios[0].inscrito).toBe(true);
        expect(resultado.torneios[0].totalInscritos).toBe(3);
        expect(resultado.torneios[1].inscrito).toBe(false);
        expect(resultado.torneios[1].totalInscritos).toBe(5);
        expect(resultado.total).toBe(2);
        expect(resultado.limite).toBe(20);
        expect(resultado.offset).toBe(0);
    });

    it("deve retornar inscrito=false para todos quando nÃ£o inscrito em nenhum", async () => {
        const torneioGateway = criarMockTorneioGateway({ listar: jest.fn().mockResolvedValue(torneios) });
        const inscricaoGateway = criarMockInscricaoGateway();
        const uc = ListarTorneios.criar(torneioGateway, inscricaoGateway);

        const resultado = await uc.executar({ usuarioId: "u3" });

        expect(resultado.torneios.every((t) => t.inscrito === false)).toBe(true);
        expect(resultado.torneios.every((t) => t.totalInscritos === 0)).toBe(true);
    });

    it("deve listar sem usuarioId (visitante) com inscrito=false e sem consultar inscricoes do usuario", async () => {
        const torneioGateway = criarMockTorneioGateway({
            listar: jest.fn().mockResolvedValue(torneios),
            listarTotal: jest.fn().mockResolvedValue(2),
        });
        const inscricaoGateway = criarMockInscricaoGateway({
            listarPorUsuario: jest.fn(),
            contarPorTorneios: jest.fn().mockResolvedValue({ t1: 1, t2: 2 }),
        });
        const uc = ListarTorneios.criar(torneioGateway, inscricaoGateway);

        const resultado = await uc.executar({});

        expect(inscricaoGateway.listarPorUsuario).not.toHaveBeenCalled();
        expect(resultado.torneios.every((t) => t.inscrito === false)).toBe(true);
        expect(resultado.torneios[0].totalInscritos).toBe(1);
    });

    it("deve retornar lista vazia", async () => {
        const torneioGateway = criarMockTorneioGateway();
        const inscricaoGateway = criarMockInscricaoGateway();
        const uc = ListarTorneios.criar(torneioGateway, inscricaoGateway);

        const resultado = await uc.executar({ usuarioId: "u1" });
        expect(resultado.torneios).toEqual([]);
        expect(resultado.total).toBe(0);
    });

    it("deve repassar limite e offset ao gateway", async () => {
        const listarMock = jest.fn().mockResolvedValue([]);
        const torneioGateway = criarMockTorneioGateway({ listar: listarMock });
        const inscricaoGateway = criarMockInscricaoGateway();
        const uc = ListarTorneios.criar(torneioGateway, inscricaoGateway);

        await uc.executar({ usuarioId: "u1", limite: 5, offset: 10 });

        expect(listarMock).toHaveBeenCalledWith(expect.objectContaining({ limite: 5, offset: 10, incluirSecretos: false }));
    });

    it("deve pedir horarioDesc ao listar finalizados (mais recente primeiro)", async () => {
        const listarMock = jest.fn().mockResolvedValue([]);
        const torneioGateway = criarMockTorneioGateway({ listar: listarMock });
        const inscricaoGateway = criarMockInscricaoGateway();
        const uc = ListarTorneios.criar(torneioGateway, inscricaoGateway);

        await uc.executar({ usuarioId: "u1", status: "finalizado" });

        expect(listarMock).toHaveBeenCalledWith(expect.objectContaining({
            status: "finalizado",
            horarioDesc: true,
        }));
    });

    it("nao deve pedir horarioDesc para inscricoes abertas", async () => {
        const listarMock = jest.fn().mockResolvedValue([]);
        const torneioGateway = criarMockTorneioGateway({ listar: listarMock });
        const inscricaoGateway = criarMockInscricaoGateway();
        const uc = ListarTorneios.criar(torneioGateway, inscricaoGateway);

        await uc.executar({ usuarioId: "u1", status: "inscricoes_abertas" });

        expect(listarMock).toHaveBeenCalledWith(expect.objectContaining({
            status: "inscricoes_abertas",
            horarioDesc: false,
        }));
    });

    it("deve limitar paginação profunda para evitar skip excessivo", async () => {
        const listarMock = jest.fn().mockResolvedValue([]);
        const torneioGateway = criarMockTorneioGateway({ listar: listarMock });
        const inscricaoGateway = criarMockInscricaoGateway();
        const uc = ListarTorneios.criar(torneioGateway, inscricaoGateway);

        const resultado = await uc.executar({ usuarioId: "u1", limite: 500, offset: 999999 });

        expect(listarMock).toHaveBeenCalledWith(expect.objectContaining({ limite: 100, offset: 5000 }));
        expect(resultado.limite).toBe(100);
        expect(resultado.offset).toBe(5000);
    });

    it("deve repassar filtro por data de inicio e fim ao gateway", async () => {
        const listarMock = jest.fn().mockResolvedValue([]);
        const listarTotalMock = jest.fn().mockResolvedValue(0);
        const torneioGateway = criarMockTorneioGateway({
            listar: listarMock,
            listarTotal: listarTotalMock,
        });
        const inscricaoGateway = criarMockInscricaoGateway();
        const uc = ListarTorneios.criar(torneioGateway, inscricaoGateway);
        const dataInicio = new Date("2026-04-01T00:00:00.000Z");
        const dataFim = new Date("2026-04-30T23:59:59.999Z");

        await uc.executar({ usuarioId: "u1", dataInicio, dataFim });

        expect(listarMock).toHaveBeenCalledWith(expect.objectContaining({
            incluirSecretos: false,
            dataInicio,
            dataFim,
        }));
        expect(listarTotalMock).toHaveBeenCalledWith(expect.objectContaining({
            incluirSecretos: false,
            dataInicio,
            dataFim,
        }));
    });

    it("nÃ£o deve incluir torneios secretos na listagem pÃºblica", async () => {
        const torneioSecreto = new Torneio({ id: "ts", nome: "Secreto", horario: new Date(), formato: "modern", donoId: "u1", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0, secreto: true });
        const listarMock = jest.fn().mockResolvedValue([torneios[0]]);
        const listarTotalMock = jest.fn().mockResolvedValue(1);
        const torneioGateway = criarMockTorneioGateway({ listar: listarMock, listarTotal: listarTotalMock });
        const inscricaoGateway = criarMockInscricaoGateway();
        const uc = ListarTorneios.criar(torneioGateway, inscricaoGateway);

        const resultado = await uc.executar({ usuarioId: "u1" });

        expect(listarMock).toHaveBeenCalledWith(expect.objectContaining({ incluirSecretos: false }));
        expect(listarTotalMock).toHaveBeenCalledWith(expect.objectContaining({ incluirSecretos: false }));
        // torneio secreto nÃ£o estÃ¡ na lista retornada pelo gateway (filtrado no nÃ­vel do repositÃ³rio)
        void torneioSecreto;
        expect(resultado.torneios).toHaveLength(1);
    });
});
