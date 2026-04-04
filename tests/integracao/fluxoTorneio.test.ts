/**
 * Teste de integração: simula o fluxo completo de um torneio
 * usando mocks in-memory para os gateways.
 */

import { Usuario } from "../../src/dominio/entidade/usuario";
import { Deck } from "../../src/dominio/entidade/deck";
import { Torneio } from "../../src/dominio/entidade/torneio";
import { Inscricao } from "../../src/dominio/entidade/inscricao";
import { Partida } from "../../src/dominio/entidade/partida";
import { UsuarioGateway } from "../../src/dominio/gateway/usuarioGateway";
import { DeckGateway, FiltrosListarDecks } from "../../src/dominio/gateway/deckGateway";
import { TorneioGateway } from "../../src/dominio/gateway/torneioGateway";
import { InscricaoGateway } from "../../src/dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../src/dominio/gateway/partidaGateway";

import { CadastrarUsuario } from "../../src/casosDeUso/usuario/cadastrarUsuario";
import { CadastrarDeck } from "../../src/casosDeUso/deck/cadastrarDeck";
import { CriarTorneio } from "../../src/casosDeUso/torneio/criarTorneio";
import { InscreverTorneio } from "../../src/casosDeUso/torneio/inscreverTorneio";
import { IniciarTorneio } from "../../src/casosDeUso/torneio/iniciarTorneio";
import { RegistrarResultado } from "../../src/casosDeUso/torneio/registrarResultado";
import { IniciarProximaRodada } from "../../src/casosDeUso/torneio/iniciarProximaRodada";
import { criarMockEmailGateway } from "../mocks/gateways";

// Mock bcrypt
jest.mock("bcryptjs", () => ({
    hash: jest.fn().mockImplementation((s: string) => Promise.resolve(`hashed_${s}`)),
    compare: jest.fn(),
}));

// Mock eventosTorneio
jest.mock("../../src/infra/socketio/eventosTorneio", () => ({
    eventosTorneio: { emit: jest.fn() },
}));

// ------- In-Memory Gateways -------

function criarUsuarioGatewayMemoria(): UsuarioGateway {
    const store = new Map<string, Usuario>();
    return {
        salvar: async (u) => { store.set(u.id, u); },
        buscarPorEmail: async (email) => Array.from(store.values()).find((u) => u.email === email) ?? null,
        buscarPorId: async (id) => store.get(id) ?? null,
        buscarVarios: async (ids) => ids.map((id) => store.get(id)).filter(Boolean) as Usuario[],
        atualizar: async (u) => { store.set(u.id, u); },
    };
}

function criarDeckGatewayMemoria(): DeckGateway {
    const store = new Map<string, Deck>();
    return {
        salvar: async (d) => { store.set(d.id, d); },
        buscarPorId: async (id) => store.get(id) ?? null,
        buscarVarios: async (ids) => ids.map((id) => store.get(id)).filter(Boolean) as Deck[],
        listarPorUsuario: async (uid) => Array.from(store.values()).filter((d) => d.usuarioId === uid),
        listar: async () => Array.from(store.values()),
        listarTotal: async () => store.size,
        atualizar: async (d) => { store.set(d.id, d); },
        excluir: async (id) => { store.delete(id); },
    };
}

function criarTorneioGatewayMemoria(partidaStoreRef: Map<string, Partida>): TorneioGateway {
    const store = new Map<string, Torneio>();
    return {
        salvar: async (t) => { store.set(t.id, t); },
        buscarPorId: async (id) => store.get(id) ?? null,
        listar: async () => Array.from(store.values()),
        listarTotal: async () => store.size,
        atualizar: async (t) => { store.set(t.id, t); },
        atualizarECriarPartidas: async (t, partidas) => {
            store.set(t.id, t);
            for (const p of partidas) partidaStoreRef.set(p.id, p);
        },
        excluir: async (id) => { store.delete(id); },
    };
}

function criarInscricaoGatewayMemoria(): InscricaoGateway {
    const store = new Map<string, Inscricao>();
    return {
        salvar: async (i) => { store.set(i.id, i); },
        buscarPorTorneioEUsuario: async (tid, uid) =>
            Array.from(store.values()).find((i) => i.torneioId === tid && i.usuarioId === uid) ?? null,
        listarPorTorneio: async (tid) => Array.from(store.values()).filter((i) => i.torneioId === tid),
        listarPorTorneios: async (tids) => Array.from(store.values()).filter((i) => tids.includes(i.torneioId)),
        listarPorUsuario: async (uid) => Array.from(store.values()).filter((i) => i.usuarioId === uid),
        atualizar: async (i) => { store.set(i.id, i); },
        excluir: async (id) => { store.delete(id); },
        contarPorTorneios: async (ids) => {
            const result: Record<string, number> = {};
            for (const id of ids) result[id] = Array.from(store.values()).filter((i) => i.torneioId === id).length;
            return result;
        },
    };
}

function criarPartidaGatewayMemoria(store: Map<string, Partida>): PartidaGateway {
    return {
        salvar: async (p) => { store.set(p.id, p); },
        salvarVarias: async (ps) => { for (const p of ps) store.set(p.id, p); },
        buscarPorId: async (id) => store.get(id) ?? null,
        listarPorTorneio: async (tid) => Array.from(store.values()).filter((p) => p.torneioId === tid),
        listarPorTorneios: async (tids) => Array.from(store.values()).filter((p) => tids.includes(p.torneioId)),
        listarPorTorneioERodada: async (tid, r) => Array.from(store.values()).filter((p) => p.torneioId === tid && p.rodada === r),
        listarPorJogadorETorneio: async (tid, uid) =>
            Array.from(store.values()).filter((p) => p.torneioId === tid && (p.jogador1Id === uid || p.jogador2Id === uid)),
        atualizar: async (p) => { store.set(p.id, p); },
        finalizarAtomicamente: async (id, v1, v2) => {
            const p = store.get(id);
            if (!p || p.status !== "pendente") return null;
            p.vitoriasJogador1 = v1;
            p.vitoriasJogador2 = v2;
            p.status = "finalizada";
            store.set(id, p);
            return p;
        },
        contestarPartida: async (id) => {
            const p = store.get(id);
            if (!p || p.status !== "finalizada") return null;
            p.vitoriasJogador1 = 0;
            p.vitoriasJogador2 = 0;
            p.status = "pendente";
            store.set(id, p);
            return p;
        },
        existePartidaRodadaPosterior: async (torneioId, rodada) =>
            Array.from(store.values()).some((p) => p.torneioId === torneioId && p.rodada > rodada),
    };
}

// ------- Teste de Integração -------

describe("Integração - Fluxo completo de torneio", () => {
    const usuarioGw = criarUsuarioGatewayMemoria();
    const deckGw = criarDeckGatewayMemoria();
    const partidaStore = new Map<string, Partida>();
    const torneioGw = criarTorneioGatewayMemoria(partidaStore);
    const inscricaoGw = criarInscricaoGatewayMemoria();
    const partidaGw = criarPartidaGatewayMemoria(partidaStore);

    let donoId: string;
    let jogador1Id: string;
    let jogador2Id: string;
    let jogador3Id: string;
    let jogador4Id: string;
    let torneioId: string;

    it("1. Deve cadastrar o dono e 4 jogadores", async () => {
        const cadastrar = CadastrarUsuario.criar(usuarioGw, criarMockEmailGateway());

        const dono = await cadastrar.executar({ nome: "Organizador", email: "org@e.com", senha: "s" });
        donoId = dono.id;

        const j1 = await cadastrar.executar({ nome: "Jogador1", email: "j1@e.com", senha: "s" });
        jogador1Id = j1.id;

        const j2 = await cadastrar.executar({ nome: "Jogador2", email: "j2@e.com", senha: "s" });
        jogador2Id = j2.id;

        const j3 = await cadastrar.executar({ nome: "Jogador3", email: "j3@e.com", senha: "s" });
        jogador3Id = j3.id;

        const j4 = await cadastrar.executar({ nome: "Jogador4", email: "j4@e.com", senha: "s" });
        jogador4Id = j4.id;

        // Configurar nickMTGO nos jogadores (requisito para inscrição em torneio)
        for (const [id, nick] of [[jogador1Id, "j1_mtgo"], [jogador2Id, "j2_mtgo"], [jogador3Id, "j3_mtgo"], [jogador4Id, "j4_mtgo"]] as [string, string][]) {
            const u = await usuarioGw.buscarPorId(id);
            u!.nickMTGO = nick;
            await usuarioGw.atualizar(u!);
        }

        expect(donoId).toBeDefined();
        expect(jogador1Id).toBeDefined();
    });

    it("2. Deve criar um torneio", async () => {
        const criarTorneio = CriarTorneio.criar(torneioGw);
        const resultado = await criarTorneio.executar({
            nome: "Torneio Integração",
            horario: new Date("2025-06-01T14:00:00Z"),
            formato: "legacy",
            donoId,
            premio: "Booster Box",
        });

        torneioId = resultado.id;
        expect(resultado.status).toBe("inscricoes_abertas");
    });

    it("3. Deve inscrever 4 jogadores", async () => {
        const inscrever = InscreverTorneio.criar(torneioGw, inscricaoGw, usuarioGw);

        for (const uid of [jogador1Id, jogador2Id, jogador3Id, jogador4Id]) {
            const res = await inscrever.executar({ torneioId, usuarioId: uid });
            expect(res.torneioId).toBe(torneioId);
        }

        const inscricoes = await inscricaoGw.listarPorTorneio(torneioId);
        expect(inscricoes).toHaveLength(4);
    });

    it("4. Deve fazer check-in dos jogadores (simular)", async () => {
        // Simular check-in direto pois depende de horário
        const inscricoes = await inscricaoGw.listarPorTorneio(torneioId);
        for (const i of inscricoes) {
            i.checkIn = true;
            i.checkInRodada = 0;
            await inscricaoGw.atualizar(i);
        }

        const atualizadas = await inscricaoGw.listarPorTorneio(torneioId);
        expect(atualizadas.every((i) => i.checkIn)).toBe(true);
    });

    it("5. Deve iniciar o torneio e gerar partidas da rodada 1", async () => {
        const iniciar = IniciarTorneio.criar(torneioGw, inscricaoGw, partidaGw, usuarioGw);
        const resultado = await iniciar.executar({ torneioId, donoId, isAdmin: false });

        expect(resultado.rodadaAtual).toBe(1);
        expect(resultado.totalRodadas).toBe(2); // ceil(log2(4))
        expect(resultado.partidas).toHaveLength(2);
        expect(resultado.partidas[0].jogador1Nome).toBeDefined();

        const torneio = await torneioGw.buscarPorId(torneioId);
        expect(torneio!.status).toBe("em_andamento");
    });

    it("6. Deve registrar resultados da rodada 1", async () => {
        const registrar = RegistrarResultado.criar(torneioGw, partidaGw);
        const partidas = await partidaGw.listarPorTorneioERodada(torneioId, 1);

        for (const p of partidas) {
            if (p.jogador2Id) {
                await registrar.executar({
                    partidaId: p.id,
                    usuarioId: p.jogador1Id,
                    vitoriasJogador1: 2,
                    vitoriasJogador2: 1,
                    isAdmin: false,
                });
            }
        }

        const atualizadas = await partidaGw.listarPorTorneioERodada(torneioId, 1);
        expect(atualizadas.every((p) => p.status === "finalizada")).toBe(true);
    });

    it("7. Deve fazer check-in entre rodadas", async () => {
        const inscricoes = await inscricaoGw.listarPorTorneio(torneioId);
        for (const i of inscricoes) {
            i.checkInRodada = 1;
            await inscricaoGw.atualizar(i);
        }
    });

    it("8. Deve avançar para rodada 2 e finalizar o torneio", async () => {
        const proximaRodada = IniciarProximaRodada.criar(torneioGw, inscricaoGw, partidaGw, usuarioGw);
        const resultado = await proximaRodada.executar({ torneioId, donoId, isAdmin: false });

        // Rodada 2 é a última (totalRodadas = 2), mas como rodadaAtual era 1, 
        // agora deve ser rodada 2 com novas partidas
        expect(resultado.finalizado).toBe(false);
        if (!resultado.finalizado) {
            expect(resultado.rodadaAtual).toBe(2);
            expect(resultado.partidas[0].jogador1Nome).toBeDefined();

            // Registrar resultados da rodada 2
            const registrar = RegistrarResultado.criar(torneioGw, partidaGw);
            for (const p of resultado.partidas) {
                if (p.jogador2Id) {
                    await registrar.executar({
                        partidaId: p.id,
                        usuarioId: p.jogador1Id,
                        vitoriasJogador1: 2,
                        vitoriasJogador2: 0,
                        isAdmin: false,
                    });
                }
            }

            // Finalizar torneio
            const final = await proximaRodada.executar({ torneioId, donoId, isAdmin: false });
            expect(final.finalizado).toBe(true);
            if (final.finalizado) {
                expect(final.classificacao.length).toBe(4);
                expect(final.classificacao[0].posicao).toBe(1);
            }
        }
    });

    it("9. Torneio deve estar finalizado", async () => {
        const torneio = await torneioGw.buscarPorId(torneioId);
        expect(torneio!.status).toBe("finalizado");
    });
});
