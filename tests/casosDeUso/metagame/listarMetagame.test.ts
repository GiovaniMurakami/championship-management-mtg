import { ListarMetagame } from "../../../src/casosDeUso/metagame/listarMetagame";
import { BuscarArquetipoMetagame } from "../../../src/casosDeUso/metagame/buscarArquetipoMetagame";
import {
    criarMockTorneioGateway,
    criarMockInscricaoGateway,
    criarMockPartidaGateway,
    criarMockDeckGateway,
    criarMockUsuarioGateway,
} from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { Partida } from "../../../src/dominio/entidade/partida";

describe("ListarMetagame / BuscarArquetipoMetagame", () => {
    it("lista vazia quando não há torneios finalizados", async () => {
        const uc = ListarMetagame.criar(
            criarMockTorneioGateway({ listar: jest.fn().mockResolvedValue([]) }),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockDeckGateway(),
            criarMockUsuarioGateway()
        );

        const resultado = await uc.executar({ formato: "pauper", dias: 30 });
        expect(resultado.arquetipos).toEqual([]);
        expect(resultado.totalDecks).toBe(0);
        expect(resultado.recentes).toEqual([]);
    });

    it("rejeita dias inválidos", async () => {
        const uc = ListarMetagame.criar(
            criarMockTorneioGateway(),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockDeckGateway(),
            criarMockUsuarioGateway()
        );

        await expect(uc.executar({ formato: "pauper", dias: 15 })).rejects.toMatchObject({ status: 400 });
    });

    it("retorna 404 quando o slug não existe", async () => {
        const uc = BuscarArquetipoMetagame.criar(
            criarMockTorneioGateway({
                listar: jest.fn().mockResolvedValue([
                    new Torneio({
                        id: "t1",
                        nome: "Evento",
                        horario: new Date(),
                        formato: "pauper",
                        donoId: "admin",
                        status: "finalizado",
                        rodadaAtual: 1,
                        totalRodadas: 1,
                    }),
                ]),
            }),
            criarMockInscricaoGateway({ listarPorTorneios: jest.fn().mockResolvedValue([]) }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([]) }),
            criarMockDeckGateway(),
            criarMockUsuarioGateway()
        );

        await expect(uc.executar({ formato: "pauper", slug: "blue-terror", dias: 30 })).rejects.toMatchObject({
            status: 404,
        });
    });

    it("rejeita formato vazio", async () => {
        const uc = ListarMetagame.criar(
            criarMockTorneioGateway(),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockDeckGateway(),
            criarMockUsuarioGateway()
        );

        await expect(uc.executar({ formato: "  ", dias: 30 })).rejects.toMatchObject({ status: 400 });
    });

    it("usa 30 dias quando dias não é informado e carrega agregação", async () => {
        const torneioGateway = criarMockTorneioGateway({
            listar: jest.fn().mockResolvedValue([
                new Torneio({
                    id: "t1",
                    nome: "Pauper",
                    horario: new Date(),
                    formato: "pauper",
                    donoId: "admin",
                    status: "finalizado",
                    rodadaAtual: 1,
                    totalRodadas: 1,
                }),
            ]),
        });
        const partidaGateway = criarMockPartidaGateway({
            listarPorTorneios: jest.fn().mockResolvedValue([
                new Partida({
                    id: "p1",
                    torneioId: "t1",
                    rodada: 1,
                    jogador1Id: "u1",
                    jogador2Id: "u2",
                    deckJogador1Id: "d1",
                    deckJogador2Id: "d2",
                    vitoriasJogador1: 0,
                    vitoriasJogador2: 0,
                    status: "pendente",
                }),
            ]),
        });
        const uc = ListarMetagame.criar(
            torneioGateway,
            criarMockInscricaoGateway({ listarPorTorneios: jest.fn().mockResolvedValue([]) }),
            partidaGateway,
            criarMockDeckGateway(),
            criarMockUsuarioGateway()
        );

        const resultado = await uc.executar({ formato: "pauper" });

        expect(resultado.dias).toBe(30);
        expect(resultado.formato).toBe("pauper");
        expect(torneioGateway.listar).toHaveBeenCalledWith(
            expect.objectContaining({ status: "finalizado", incluirSecretos: false })
        );
        expect(partidaGateway.listarPorTorneios).toHaveBeenCalledWith(["t1"]);
    });

    it("retorna detalhe quando o slug existe e rejeita slug vazio", async () => {
        const torneio = new Torneio({
            id: "t1",
            nome: "Evento",
            horario: new Date(),
            formato: "pauper",
            donoId: "admin",
            status: "finalizado",
            rodadaAtual: 1,
            totalRodadas: 1,
        });
        const deck = new Deck({
            id: "d1",
            nome: "Meu Terror",
            nomeConsolidado: "Blue Terror",
            formato: "pauper",
            maindeck: [{ nome: "brainstorm", quantidade: 4 }],
            sideboard: [],
            usuarioId: "u1",
        });
        const uc = BuscarArquetipoMetagame.criar(
            criarMockTorneioGateway({ listar: jest.fn().mockResolvedValue([torneio]) }),
            criarMockInscricaoGateway({
                listarPorTorneios: jest.fn().mockResolvedValue([
                    new Inscricao({ id: "i1", torneioId: "t1", usuarioId: "u1", deckId: "d1" }),
                ]),
            }),
            criarMockPartidaGateway({ listarPorTorneios: jest.fn().mockResolvedValue([]) }),
            criarMockDeckGateway({ buscarVarios: jest.fn().mockResolvedValue([deck]) }),
            criarMockUsuarioGateway({
                buscarVarios: jest.fn().mockResolvedValue([
                    new Usuario({
                        id: "u1",
                        nome: "Alice",
                        email: "a@a.com",
                        senha: "h",
                        nickMTGO: "alice_mtgo",
                    }),
                ]),
            })
        );

        await expect(uc.executar({ formato: "pauper", slug: "  ", dias: 30 })).rejects.toMatchObject({
            status: 400,
        });
        await expect(uc.executar({ formato: "pauper", slug: undefined as unknown as string })).rejects.toMatchObject({
            status: 400,
        });

        const detalhe = await uc.executar({ formato: "pauper", slug: "blue-terror" });
        expect(detalhe.nome).toBe("Blue Terror");
        expect(detalhe.slug).toBe("blue-terror");
        expect(detalhe.listas[0].usuario.nome).toBe("alice_mtgo");
        expect(detalhe.dias).toBe(30);
    });
});
