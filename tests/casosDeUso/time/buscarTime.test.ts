import { BuscarTime } from "../../../src/casosDeUso/time/buscarTime";
import { criarMockInscricaoGateway, criarMockPartidaGateway, criarMockTimeGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Time } from "../../../src/dominio/entidade/time";
import { Usuario } from "../../../src/dominio/entidade/usuario";

const timeExistente = new Time({
    id: "time-1",
    nome: "Team Alpha",
    donoId: "user-1",
    membroIds: ["user-1", "user-2"],
    criadoEm: new Date(),
});

const usuarios = [
    new Usuario({ id: "user-1", nome: "Alice", email: "a@a.com", senha: "hash" }),
    new Usuario({ id: "user-2", nome: "Bob", email: "b@b.com", senha: "hash" }),
];

describe("BuscarTime", () => {
    const criarCasoDeUso = (timeGateway = criarMockTimeGateway(), usuarioGateway = criarMockUsuarioGateway(), inscricaoGateway = criarMockInscricaoGateway(), partidaGateway = criarMockPartidaGateway()) =>
        BuscarTime.criar(timeGateway, usuarioGateway, inscricaoGateway, partidaGateway);

    it("deve retornar o time com membros resolvidos", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const usuarioGateway = criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) });
        const uc = criarCasoDeUso(timeGateway, usuarioGateway);

        const resultado = await uc.executar({ id: "time-1" });

        expect(resultado.id).toBe("time-1");
        expect(resultado.membros).toHaveLength(2);
        expect(resultado.membros[0].nome).toBe("Alice");
        expect(resultado.estatisticas.winRate).toBe(0);
    });

    it("deve lancar 404 se o time nao existir", async () => {
        const timeGateway = criarMockTimeGateway();
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = criarCasoDeUso(timeGateway, usuarioGateway);

        await expect(uc.executar({ id: "nao-existe" })).rejects.toMatchObject({ status: 404 });
    });

    it("deve retornar listas vazias sem buscar usuarios quando time nao tem membros nem solicitacoes", async () => {
        const timeSemMembros = new Time({
            id: "time-vazio",
            nome: "Time Vazio",
            donoId: "user-1",
            membroIds: [],
            solicitacoesPendentes: [],
        });
        const buscarVarios = jest.fn().mockResolvedValue([]);
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeSemMembros) });
        const usuarioGateway = criarMockUsuarioGateway({ buscarVarios });
        const uc = criarCasoDeUso(timeGateway, usuarioGateway);

        const resultado = await uc.executar({ id: "time-vazio" });

        expect(buscarVarios).not.toHaveBeenCalled();
        expect(resultado.membros).toEqual([]);
        expect(resultado.solicitacoesPendentes).toEqual([]);
    });

    it("deve usar o id como nome quando usuario nao for encontrado", async () => {
        const timeComSolicitacao = new Time({
            id: "time-1",
            nome: "Team Alpha",
            donoId: "user-1",
            membroIds: ["user-1", "user-3"],
            solicitacoesPendentes: ["user-4"],
        });
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeComSolicitacao) });
        const usuarioGateway = criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue([usuarios[0]]) });
        const uc = criarCasoDeUso(timeGateway, usuarioGateway);

        const resultado = await uc.executar({ id: "time-1" });

        expect(resultado.membros).toEqual([
            expect.objectContaining({ id: "user-1", nome: "Alice", excluido: false }),
            expect.objectContaining({ id: "user-3", nome: "user-3", excluido: false }),
        ]);
        expect(resultado.solicitacoesPendentes).toEqual([
            { id: "user-4", nome: "user-4", excluido: false },
        ]);
    });

    it("deve calcular win rate do time e de cada membro sem contar bye", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const usuarioGateway = criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) });
        const inscricaoGateway = criarMockInscricaoGateway({
            listarPorUsuario: jest.fn().mockImplementation((usuarioId: string) => Promise.resolve([
                new Inscricao({ id: `i-${usuarioId}`, torneioId: "torneio-1", usuarioId }),
            ])),
        });
        const partidaGateway = criarMockPartidaGateway({
            listarPorTorneios: jest.fn().mockResolvedValue([
                new Partida({ id: "p1", torneioId: "torneio-1", rodada: 1, jogador1Id: "user-1", jogador2Id: "oponente", vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
                new Partida({ id: "p2", torneioId: "torneio-1", rodada: 2, jogador1Id: "user-2", jogador2Id: "oponente", vitoriasJogador1: 1, vitoriasJogador2: 2, status: "finalizada" }),
                new Partida({ id: "p3", torneioId: "torneio-1", rodada: 3, jogador1Id: "user-1", jogador2Id: null, vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada" }),
            ]),
        });
        const uc = criarCasoDeUso(timeGateway, usuarioGateway, inscricaoGateway, partidaGateway);

        const resultado = await uc.executar({ id: "time-1" });

        expect(resultado.estatisticas).toEqual({ partidas: 2, vitorias: 1, derrotas: 1, empates: 0, winRate: 50 });
        expect(resultado.membros[0].estatisticas.winRate).toBe(100);
        expect(resultado.membros[1].estatisticas.winRate).toBe(0);
    });
});
