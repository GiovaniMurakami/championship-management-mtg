/**
 * Teste de integração: Torneio completo para 150 jogadores
 *
 * Valida o fluxo Swiss end-to-end:
 *   - Cadastro de 150 jogadores com decks
 *   - Inscrição e escolha de deck
 *   - Check-in e início do torneio
 *   - 8 rodadas Swiss (ceil(log2(150)) = 8)
 *   - Drop de 10 jogadores após rodada 4
 *   - Standings com checkInRodada, rodadaIniciadaEm (Brasília), MWP/GWP
 *   - Finalização e classificação final completa
 */

import { Usuario } from "../../src/dominio/entidade/usuario";
import { Deck } from "../../src/dominio/entidade/deck";
import { Torneio } from "../../src/dominio/entidade/torneio";
import { Inscricao } from "../../src/dominio/entidade/inscricao";
import { Partida } from "../../src/dominio/entidade/partida";

import { UsuarioGateway } from "../../src/dominio/gateway/usuarioGateway";
import { DeckGateway } from "../../src/dominio/gateway/deckGateway";
import { TorneioGateway } from "../../src/dominio/gateway/torneioGateway";
import { InscricaoGateway } from "../../src/dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../src/dominio/gateway/partidaGateway";

import { CadastrarUsuario } from "../../src/casosDeUso/usuario/cadastrarUsuario";
import { CadastrarDeck } from "../../src/casosDeUso/deck/cadastrarDeck";
import { CriarTorneio } from "../../src/casosDeUso/torneio/criarTorneio";
import { InscreverTorneio } from "../../src/casosDeUso/torneio/inscreverTorneio";
import { EscolherDeckTorneio } from "../../src/casosDeUso/torneio/escolherDeckTorneio";
import { IniciarTorneio } from "../../src/casosDeUso/torneio/iniciarTorneio";
import { RegistrarResultado } from "../../src/casosDeUso/torneio/registrarResultado";
import { IniciarProximaRodada } from "../../src/casosDeUso/torneio/iniciarProximaRodada";
import { BuscarStandings } from "../../src/casosDeUso/torneio/buscarStandings";
import { DroparJogador } from "../../src/casosDeUso/torneio/droparJogador";

import { criarMockEmailGateway, criarMockChatGptGateway, criarMockTimeGateway } from "../mocks/gateways";

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("bcryptjs", () => ({
    hash: jest.fn().mockImplementation((s: string) => Promise.resolve(`hashed_${s}`)),
    compare: jest.fn(),
}));

jest.mock("../../src/infra/socketio/eventosTorneio", () => ({
    eventosTorneio: { emit: jest.fn() },
}));

// ─── In-Memory Gateway Factories ────────────────────────────────────────────

function criarUsuarioGwMemoria(): UsuarioGateway {
    const store = new Map<string, Usuario>();
    return {
        salvar: async (u) => { store.set(u.id, u); },
        buscarPorEmail: async (email) => Array.from(store.values()).find((u) => u.email === email) ?? null,
        buscarPorId: async (id) => store.get(id) ?? null,
        buscarVarios: async (ids) => ids.map((id) => store.get(id)).filter(Boolean) as Usuario[],
        atualizar: async (u) => { store.set(u.id, u); },
        incrementarResultadosExpressivos: async (ids, incremento) => {
            ids.forEach((id) => {
                const usuario = store.get(id);
                if (usuario) usuario.resultadosExpressivos = (usuario.resultadosExpressivos ?? 0) + incremento;
            });
        },
    };
}

function criarDeckGwMemoria(): DeckGateway {
    const store = new Map<string, Deck>();
    return {
        salvar: async (d) => { store.set(d.id, d); },
        buscarPorId: async (id) => store.get(id) ?? null,
        buscarVarios: async (ids) => ids.map((id) => store.get(id)).filter(Boolean) as Deck[],
        listarPorUsuario: async (uid) => Array.from(store.values()).filter((d) => d.usuarioId === uid),
        listar: async () => Array.from(store.values()),
        listarTotal: async (filtros) => {
            const all = Array.from(store.values());
            const filtered = filtros?.usuarioId ? all.filter((d) => d.usuarioId === filtros.usuarioId) : all;
            return filtered.length;
        },
        atualizar: async (d) => { store.set(d.id, d); },
        excluir: async (id) => { store.delete(id); },
    };
}

function criarTorneioGwMemoria(partidaStoreRef: Map<string, Partida>): TorneioGateway {
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

function criarInscricaoGwMemoria(): InscricaoGateway {
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

function criarPartidaGwMemoria(store: Map<string, Partida>): PartidaGateway {
    return {
        salvar: async (p) => { store.set(p.id, p); },
        salvarVarias: async (ps) => { for (const p of ps) store.set(p.id, p); },
        buscarPorId: async (id) => store.get(id) ?? null,
        listarPorTorneio: async (tid) => Array.from(store.values()).filter((p) => p.torneioId === tid),
        listarPorTorneios: async (tids) => Array.from(store.values()).filter((p) => tids.includes(p.torneioId)),
        listarPorTorneioERodada: async (tid, r) =>
            Array.from(store.values()).filter((p) => p.torneioId === tid && p.rodada === r),
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
        ajustarResultadoContestado: async (id, v1, v2) => {
            const p = store.get(id);
            if (!p) return null;
            p.vitoriasJogador1 = v1;
            p.vitoriasJogador2 = v2;
            p.status = "finalizada";
            store.set(id, p);
            return p;
        },
        atualizarJogador2Partida: async (id, jogador2Id) => {
            const p = store.get(id);
            if (!p) return null;
            (p as any).jogador2Id = jogador2Id;
            store.set(id, p);
            return p;
        },
        buscarByePartidaRodada: async (torneioId, rodada) =>
            Array.from(store.values()).find(
                (p) => p.torneioId === torneioId && p.rodada === rodada && p.jogador2Id === null,
            ) ?? null,
    };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_JOGADORES = 150;
// ceil(log2(150)) = ceil(7.2274) = 8
const TOTAL_RODADAS_ESPERADAS = 8;
const TOTAL_DROPS = 10;
// Rodadas 1-4: 150 players (even) → 75 matches each, no BYE
const PARTIDAS_POR_RODADA_FASE1 = 75;
// After 10 drops: 140 players (even) → 70 matches each, no BYE
const PARTIDAS_POR_RODADA_FASE2 = 70;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Simula check-in de todos os jogadores ativos para a rodada atual.
 * Define checkInRodada = torneio.rodadaAtual nos inscritos não dropados.
 */
async function simularCheckIn(
    torneioGw: TorneioGateway,
    inscricaoGw: InscricaoGateway,
    torneioId: string,
): Promise<void> {
    const torneio = await torneioGw.buscarPorId(torneioId);
    const inscricoes = await inscricaoGw.listarPorTorneio(torneioId);
    for (const i of inscricoes) {
        if (!i.dropped) {
            i.checkInRodada = torneio!.rodadaAtual;
            await inscricaoGw.atualizar(i);
        }
    }
}

/**
 * Registra o resultado de todas as partidas pendentes de uma rodada.
 * jogador1 sempre ganha 2-1. Partidas BYE são contadas mas não registradas
 * (são auto-finalizadas pelo IniciarTorneio/IniciarProximaRodada).
 */
async function registrarResultadosRodada(
    torneioId: string,
    rodada: number,
    partidaGw: PartidaGateway,
    registrar: RegistrarResultado,
): Promise<{ totalPartidas: number; totalByes: number }> {
    const partidas = await partidaGw.listarPorTorneioERodada(torneioId, rodada);
    let totalByes = 0;
    for (const p of partidas) {
        if (p.jogador2Id === null) {
            totalByes++;
        } else if (p.status === "pendente") {
            await registrar.executar({
                partidaId: p.id,
                usuarioId: p.jogador1Id,
                vitoriasJogador1: 2,
                vitoriasJogador2: 1,
                isAdmin: false,
            });
        }
    }
    return { totalPartidas: partidas.length, totalByes };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("Integração - Torneio 150 jogadores (Swiss completo)", () => {
    // Shared gateway instances — persisted across all `it` blocks
    const usuarioGw = criarUsuarioGwMemoria();
    const deckGw = criarDeckGwMemoria();
    const partidaStore = new Map<string, Partida>();
    const torneioGw = criarTorneioGwMemoria(partidaStore);
    const inscricaoGw = criarInscricaoGwMemoria();
    const partidaGw = criarPartidaGwMemoria(partidaStore);

    // Shared state populated by each step
    let donoId: string;
    const jogadorIds: string[] = [];
    const deckIds: string[] = [];
    let torneioId: string;
    const jogadoresDropados: string[] = [];

    // Lazily-constructed use cases (gateways are ready at construction time)
    const mkRegistrar = () => RegistrarResultado.criar(torneioGw, partidaGw);
    const mkProxima = () => IniciarProximaRodada.criar(torneioGw, inscricaoGw, partidaGw, usuarioGw);
    const mkStandings = () => BuscarStandings.criar(torneioGw, inscricaoGw, partidaGw, usuarioGw, deckGw, criarMockTimeGateway());

    // ── 1. Setup ──────────────────────────────────────────────────────────────

    it("1. Deve cadastrar 150 jogadores com nickMTGO e criar um deck por jogador", async () => {
        const cadastrarUsuario = CadastrarUsuario.criar(usuarioGw, criarMockEmailGateway());
        const cadastrarDeck = CadastrarDeck.criar(deckGw, criarMockChatGptGateway());

        const dono = await cadastrarUsuario.executar({
            nome: "Organizador",
            email: "org@gp150.com",
            senha: "senha123",
        });
        donoId = dono.id;

        for (let i = 0; i < TOTAL_JOGADORES; i++) {
            const u = await cadastrarUsuario.executar({
                nome: `Jogador${String(i + 1).padStart(3, "0")}`,
                email: `j${i + 1}@gp150.com`,
                senha: "senha123",
            });

            // nickMTGO é obrigatório para inscrição em torneio
            const usuario = await usuarioGw.buscarPorId(u.id);
            usuario!.nickMTGO = `j${i + 1}_mtgo`;
            await usuarioGw.atualizar(usuario!);
            jogadorIds.push(u.id);

            // Each player registers their own deck (60-card Legacy)
            const d = await cadastrarDeck.executar({
                nome: `Deck_${i + 1}`,
                formato: "legacy",
                maindeck: [{ nome: "Lightning Bolt", quantidade: 60 }],
                sideboard: [],
                usuarioId: u.id,
                usuarioNome: usuario!.nome,
            });
            deckIds.push(d.id);
        }

        expect(jogadorIds).toHaveLength(TOTAL_JOGADORES);
        expect(deckIds).toHaveLength(TOTAL_JOGADORES);
        // Every deck belongs to its owner
        for (let i = 0; i < TOTAL_JOGADORES; i++) {
            const d = await deckGw.buscarPorId(deckIds[i]);
            expect(d!.usuarioId).toBe(jogadorIds[i]);
        }
    }, 60_000);

    // ── 2. Tournament creation + enrollment ──────────────────────────────────

    it("2. Deve criar torneio e inscrever todos os 150 jogadores", async () => {
        const criarTorneio = CriarTorneio.criar(torneioGw);
        const torneio = await criarTorneio.executar({
            nome: "Grand Prix 150 Jogadores",
            horario: new Date("2026-04-06T14:00:00Z"),
            formato: "legacy",
            donoId,
            descricao: "Booster Box",
        });
        torneioId = torneio.id;
        expect(torneio.status).toBe("inscricoes_abertas");

        const inscrever = InscreverTorneio.criar(torneioGw, inscricaoGw, usuarioGw);
        for (const uid of jogadorIds) {
            const res = await inscrever.executar({ torneioId, usuarioId: uid });
            expect(res.torneioId).toBe(torneioId);
        }

        const inscricoes = await inscricaoGw.listarPorTorneio(torneioId);
        expect(inscricoes).toHaveLength(TOTAL_JOGADORES);
        // All inscriptions start without a deck selected
        expect(inscricoes.every((i) => !i.deckId)).toBe(true);
    }, 30_000);

    // ── 3. Deck selection ────────────────────────────────────────────────────

    it("3. Cada jogador deve escolher seu deck para o torneio", async () => {
        const escolher = EscolherDeckTorneio.criar(torneioGw, inscricaoGw, deckGw);

        for (let i = 0; i < TOTAL_JOGADORES; i++) {
            await escolher.executar({
                torneioId,
                usuarioId: jogadorIds[i],
                usuarioNome: `Jogador${String(i + 1).padStart(3, "0")}`,
                isAdmin: false,
                deckId: deckIds[i],
            });
        }

        const inscricoes = await inscricaoGw.listarPorTorneio(torneioId);
        const comDeck = inscricoes.filter((i) => !!i.deckId);
        expect(comDeck).toHaveLength(TOTAL_JOGADORES);

        // Verify each player selected the correct deck
        for (let i = 0; i < TOTAL_JOGADORES; i++) {
            const insc = inscricoes.find((r) => r.usuarioId === jogadorIds[i]);
            expect(insc?.deckId).toBeDefined();
            expect(insc?.deckId).not.toBe(deckIds[i]);
            const deckTravado = await deckGw.buscarPorId(insc!.deckId!);
            expect(deckTravado?.deckOriginalId).toBe(deckIds[i]);
            expect(deckTravado?.oculto).toBe(true);
            expect(deckTravado?.travado).toBe(true);
        }
    }, 30_000);

    // ── 4. Check-in inicial + iniciar torneio ────────────────────────────────

    it("4. Deve simular check-in inicial e iniciar o torneio com 8 rodadas", async () => {
        // Simula o check-in de abertura de inscrições (fase de inscrições_abertas)
        const inscricoes = await inscricaoGw.listarPorTorneio(torneioId);
        for (const i of inscricoes) {
            i.checkInRodada = 0;
            await inscricaoGw.atualizar(i);
        }

        const iniciar = IniciarTorneio.criar(torneioGw, inscricaoGw, partidaGw, usuarioGw);
        const resultado = await iniciar.executar({ torneioId, donoId, isAdmin: false });

        // Validate tournament state
        expect(resultado.rodadaAtual).toBe(1);
        expect(resultado.totalRodadas).toBe(TOTAL_RODADAS_ESPERADAS);

        // 150 even players => 75 matches, no BYE
        expect(resultado.partidas).toHaveLength(PARTIDAS_POR_RODADA_FASE1);
        for (const p of resultado.partidas) {
            expect(p.jogador1Id).toBeDefined();
            expect(p.jogador2Id).not.toBeNull();
            expect(p.jogador1Nome).toBeDefined();
            expect(p.jogador2Nome).toBeDefined();
        }

        // All 150 players are paired in round 1 — no player appears twice
        const idsRodada1 = resultado.partidas.flatMap((p) => [p.jogador1Id, p.jogador2Id!]);
        const uniqueIds = new Set(idsRodada1);
        expect(uniqueIds.size).toBe(TOTAL_JOGADORES);

        const torneio = await torneioGw.buscarPorId(torneioId);
        expect(torneio!.status).toBe("em_andamento");
        // rodadaIniciadaEm deve ser definido ao iniciar
        expect(torneio!.rodadaIniciadaEm).toBeInstanceOf(Date);
    }, 30_000);

    // ── 5. Rodadas 1–4 ──────────────────────────────────────────────────────

    it("5. Deve processar as rodadas 1 a 4 registrando resultados e avançando", async () => {
        for (let rodada = 1; rodada <= 4; rodada++) {
            // Register all results for the current round
            const { totalPartidas, totalByes } = await registrarResultadosRodada(
                torneioId, rodada, partidaGw, mkRegistrar(),
            );
            expect(totalPartidas).toBe(PARTIDAS_POR_RODADA_FASE1);
            expect(totalByes).toBe(0); // 150 players (even) → no BYE

            // All matches for this round must be finalized
            const partidas = await partidaGw.listarPorTorneioERodada(torneioId, rodada);
            expect(partidas.every((p) => p.status === "finalizada")).toBe(true);

            // Advance to next round (except after round 4 — handled in later steps)
            if (rodada < 4) {
                await simularCheckIn(torneioGw, inscricaoGw, torneioId);
                const res = await mkProxima().executar({ torneioId, donoId, isAdmin: false });
                expect(res.finalizado).toBe(false);
                if (!res.finalizado) {
                    expect(res.rodadaAtual).toBe(rodada + 1);
                    expect(res.partidas).toHaveLength(PARTIDAS_POR_RODADA_FASE1);
                    // Validate no player is paired against themselves
                    for (const p of res.partidas) {
                        if (p.jogador2Id !== null) {
                            expect(p.jogador1Id).not.toBe(p.jogador2Id);
                        }
                    }
                }
            }
        }
    }, 60_000);

    // ── 6. Standings validation after round 4 ───────────────────────────────

    it("6. Deve retornar standings corretos após a rodada 4", async () => {
        const resultado = await mkStandings().executar({ torneioId });

        // Tournament metadata
        expect(resultado.torneioId).toBe(torneioId);
        expect(resultado.rodadaAtual).toBe(4);
        expect(resultado.totalRodadas).toBe(TOTAL_RODADAS_ESPERADAS);
        expect(resultado.status).toBe("em_andamento");

        // rodadaIniciadaEm in Brasília timezone format
        expect(resultado.rodadaIniciadaEm).toBeDefined();
        expect(resultado.rodadaIniciadaEm).toMatch(/-03:00$/);

        // All 150 players are in standings
        expect(resultado.standings).toHaveLength(TOTAL_JOGADORES);

        // Positions are 1..150 with no gaps and no duplicates
        const posicoes = resultado.standings.map((s) => s.posicao).sort((a, b) => a - b);
        expect(posicoes[0]).toBe(1);
        expect(posicoes[TOTAL_JOGADORES - 1]).toBe(TOTAL_JOGADORES);
        const uniquePosicoes = new Set(posicoes);
        expect(uniquePosicoes.size).toBe(TOTAL_JOGADORES);

        for (const entry of resultado.standings) {
            // Required fields present
            expect(entry.usuario.id).toBeDefined();
            expect(entry.usuario.nome).toBeDefined();
            expect(typeof entry.checkInRodada).toBe("number");
            expect(typeof entry.dropped).toBe("boolean");

            // Non-negative counts
            expect(entry.pontosMesa).toBeGreaterThanOrEqual(0);
            // Standings shows rounds 1..rodadaAtual-1 (current round excluded until finalizado)
            // rodadaAtual=4 → rounds 1-3 counted → 3 matches per player
            expect(entry.vitoriasPartida + entry.empatesPartida + entry.derrotasPartida).toBe(3);
            expect(entry.mwp).toBeGreaterThanOrEqual(0);
            expect(entry.mwp).toBeLessThanOrEqual(1);
            expect(entry.omwp).toBeGreaterThanOrEqual(0);
            expect(entry.omwp).toBeLessThanOrEqual(1);
            expect(entry.gwp).toBeGreaterThanOrEqual(0);
            expect(entry.gwp).toBeLessThanOrEqual(1);
            expect(entry.ogwp).toBeGreaterThanOrEqual(0);
            expect(entry.ogwp).toBeLessThanOrEqual(1);

            // Every player has a deck from step 3
            expect(entry.deckId).toBeTruthy();
            expect(entry.deckNome).toBeTruthy();

            // No-one is dropped yet
            expect(entry.dropped).toBe(false);
        }

        // Standings are sorted: first entry has at least as many points as the last
        const primeiro = resultado.standings[0];
        const ultimo = resultado.standings[TOTAL_JOGADORES - 1];
        expect(primeiro.pontosMesa).toBeGreaterThan(ultimo.pontosMesa);

        // After 3 consolidated rounds: top player won all 3 (9 pts) or at minimum 2 (6 pts)
        expect(primeiro.pontosMesa).toBeGreaterThanOrEqual(6);

        // Bottom player lost at least 2 of 3 consolidated rounds (≤3 points)
        expect(ultimo.pontosMesa).toBeLessThanOrEqual(3);
    }, 30_000);

    // ── 7. Drop 10 players after round 4 ────────────────────────────────────

    it("7. Deve dropar 10 dos piores colocados após a rodada 4", async () => {
        const dropar = DroparJogador.criar(torneioGw, inscricaoGw, usuarioGw, partidaGw);

        // Pick the bottom 10 from current standings
        const standingsResult = await mkStandings().executar({ torneioId });
        const candidatos = standingsResult.standings.slice(-TOTAL_DROPS);

        for (const entry of candidatos) {
            await dropar.executar({
                torneioId,
                requisitanteId: donoId,
                isAdmin: true,
                jogadorId: entry.usuario.id,
            });
            jogadoresDropados.push(entry.usuario.id);
        }

        // Verify drops persisted
        const inscricoes = await inscricaoGw.listarPorTorneio(torneioId);
        const drops = inscricoes.filter((i) => i.dropped);
        expect(drops).toHaveLength(TOTAL_DROPS);

        // Dropped players should appear in standings with dropped=true
        const standingsAposDrops = await mkStandings().executar({ torneioId });
        expect(standingsAposDrops.standings).toHaveLength(TOTAL_JOGADORES); // Still 150 entries
        for (const dropId of jogadoresDropados) {
            const entry = standingsAposDrops.standings.find((s) => s.usuario.id === dropId);
            expect(entry).toBeDefined();
            expect(entry!.dropped).toBe(true);
        }
    }, 30_000);

    // ── 8. Round 5 — first round after drops ────────────────────────────────

    it("8. Deve avançar para rodada 5 com 140 jogadores ativos e sem BYEs", async () => {
        await simularCheckIn(torneioGw, inscricaoGw, torneioId);
        const res = await mkProxima().executar({ torneioId, donoId, isAdmin: false });
        expect(res.finalizado).toBe(false);

        if (!res.finalizado) {
            expect(res.rodadaAtual).toBe(5);

            // 140 active players (even) → 70 matches, no BYE
            expect(res.partidas).toHaveLength(PARTIDAS_POR_RODADA_FASE2);
            const byes = res.partidas.filter((p) => p.jogador2Id === null);
            expect(byes).toHaveLength(0);

            // Dropped players must not appear in any match
            const idsNaRodada5 = new Set(
                res.partidas.flatMap((p) => [p.jogador1Id, p.jogador2Id].filter(Boolean)),
            );
            for (const dropId of jogadoresDropados) {
                expect(idsNaRodada5.has(dropId)).toBe(false);
            }

            // All active (non-dropped) players are paired exactly once
            const inscricoes = await inscricaoGw.listarPorTorneio(torneioId);
            const ativos = inscricoes.filter((i) => !i.dropped).map((i) => i.usuarioId);
            expect(ativos).toHaveLength(TOTAL_JOGADORES - TOTAL_DROPS);
            expect(idsNaRodada5.size).toBe(TOTAL_JOGADORES - TOTAL_DROPS);
        }
    }, 30_000);

    // ── 9. Rounds 5–8 (complete and finalize) ───────────────────────────────

    it("9. Deve completar as rodadas 5 a 8 e finalizar o torneio", async () => {
        for (let rodada = 5; rodada <= TOTAL_RODADAS_ESPERADAS; rodada++) {
            // Register all results for the current round
            const { totalPartidas, totalByes } = await registrarResultadosRodada(
                torneioId, rodada, partidaGw, mkRegistrar(),
            );
            expect(totalPartidas).toBe(PARTIDAS_POR_RODADA_FASE2);
            expect(totalByes).toBe(0); // 140 players (even) → no BYE

            // Validate all matches finalized
            const partidas = await partidaGw.listarPorTorneioERodada(torneioId, rodada);
            expect(partidas.every((p) => p.status === "finalizada")).toBe(true);

            // Check-in and advance (or finalize)
            await simularCheckIn(torneioGw, inscricaoGw, torneioId);
            const res = await mkProxima().executar({ torneioId, donoId, isAdmin: false });

            if (rodada < TOTAL_RODADAS_ESPERADAS) {
                // Intermediate round: should produce new matches
                expect(res.finalizado).toBe(false);
                if (!res.finalizado) {
                    expect(res.rodadaAtual).toBe(rodada + 1);
                    expect(res.partidas).toHaveLength(PARTIDAS_POR_RODADA_FASE2);
                    // Dropped players must not appear
                    const idsRodada = new Set(
                        res.partidas.flatMap((p) => [p.jogador1Id, p.jogador2Id].filter(Boolean)),
                    );
                    for (const dropId of jogadoresDropados) {
                        expect(idsRodada.has(dropId)).toBe(false);
                    }
                }
            } else {
                // Last round: must finalize
                expect(res.finalizado).toBe(true);
                if (res.finalizado) {
                    expect(res.classificacao).toHaveLength(TOTAL_JOGADORES);

                    // Positions are continuous from 1 to 150
                    const sorted = [...res.classificacao].sort((a, b) => a.posicao - b.posicao);
                    expect(sorted[0].posicao).toBe(1);
                    expect(sorted[TOTAL_JOGADORES - 1].posicao).toBe(TOTAL_JOGADORES);

                    // Best and worst differ significantly in points
                    expect(sorted[0].pontosMesa).toBeGreaterThan(sorted[TOTAL_JOGADORES - 1].pontosMesa);

                    // Winner has non-zero tie-breakers
                    expect(sorted[0].omwp).toBeGreaterThan(0);
                    expect(sorted[0].gwp).toBeGreaterThan(0);
                }
            }
        }
    }, 120_000);

    // ── 10. Final standings validation ──────────────────────────────────────

    it("10. Deve retornar standings finais completos com 150 jogadores", async () => {
        const torneio = await torneioGw.buscarPorId(torneioId);
        expect(torneio!.status).toBe("finalizado");

        const resultado = await mkStandings().executar({ torneioId });
        expect(resultado.status).toBe("finalizado");
        expect(resultado.torneioId).toBe(torneioId);
        expect(resultado.standings).toHaveLength(TOTAL_JOGADORES);

        // Every player has recorded at least one match across 8 rounds
        for (const entry of resultado.standings) {
            expect(entry.vitoriasPartida + entry.empatesPartida + entry.derrotasPartida).toBeGreaterThan(0);
        }

        // Validate dropped players are present and flagged
        expect(jogadoresDropados).toHaveLength(TOTAL_DROPS);
        for (const dropId of jogadoresDropados) {
            const entry = resultado.standings.find((s) => s.usuario.id === dropId);
            expect(entry).toBeDefined();
            expect(entry!.dropped).toBe(true);
            // Dropped players played rounds 1-4 (4 matches)
            expect(entry!.vitoriasPartida + entry!.empatesPartida + entry!.derrotasPartida).toBe(4);
        }

        // Active players played all 8 rounds
        const ativos = resultado.standings.filter((s) => !s.dropped);
        expect(ativos).toHaveLength(TOTAL_JOGADORES - TOTAL_DROPS);
        for (const entry of ativos) {
            expect(entry.vitoriasPartida + entry.empatesPartida + entry.derrotasPartida).toBe(8);
        }

        // All tie-breakers are valid probabilities [0, 1]
        for (const entry of resultado.standings) {
            expect(entry.mwp).toBeGreaterThanOrEqual(0);
            expect(entry.mwp).toBeLessThanOrEqual(1);
            expect(entry.omwp).toBeGreaterThanOrEqual(0);
            expect(entry.omwp).toBeLessThanOrEqual(1);
            expect(entry.gwp).toBeGreaterThanOrEqual(0);
            expect(entry.gwp).toBeLessThanOrEqual(1);
            expect(entry.ogwp).toBeGreaterThanOrEqual(0);
            expect(entry.ogwp).toBeLessThanOrEqual(1);
        }

        // Standings are ordered: no position has a lower pontosMesa than a later position
        for (let i = 0; i < resultado.standings.length - 1; i++) {
            expect(resultado.standings[i].pontosMesa).toBeGreaterThanOrEqual(
                resultado.standings[i + 1].pontosMesa,
            );
        }
    }, 30_000);

    // ── 11. Cross-round pairing uniqueness ──────────────────────────────────

    it("11. Deve ter rematches mínimos no Swiss (algoritmo prioriza pareamentos únicos)", async () => {
        const todasPartidas = await partidaGw.listarPorTorneio(torneioId);
        const pareamentos = new Map<string, number>();

        for (const p of todasPartidas) {
            if (p.jogador2Id === null) continue; // skip BYEs
            const chave = [p.jogador1Id, p.jogador2Id].sort().join("|");
            pareamentos.set(chave, (pareamentos.get(chave) ?? 0) + 1);
        }

        // Every unique pairing key = one valid match slot
        // Rematches may occur in late rounds when the pool of unique opponents is exhausted.
        // With 150 players / 8 rounds, rematches should be very rare (< 2% of matches = ~12 max)
        const rematches = Array.from(pareamentos.values()).filter((v) => v > 1).length;
        expect(rematches).toBeLessThan(12);

        // Regardless of rematches, total match slots must be correct
        const totalMatchSlots =
            4 * PARTIDAS_POR_RODADA_FASE1 + 4 * PARTIDAS_POR_RODADA_FASE2;
        const totalPartidas = todasPartidas.filter((p) => p.jogador2Id !== null).length;
        expect(totalPartidas).toBe(totalMatchSlots);
    }, 30_000);

    // ── 12. Total match count consistency ───────────────────────────────────

    it("12. O total de partidas deve ser consistente com as rodadas e jogadores", async () => {
        const todasPartidas = await partidaGw.listarPorTorneio(torneioId);

        // Rounds 1-4: 75 matches each; rounds 5-8: 70 matches each
        const totalEsperado = 4 * PARTIDAS_POR_RODADA_FASE1 + 4 * PARTIDAS_POR_RODADA_FASE2;
        expect(todasPartidas).toHaveLength(totalEsperado);

        // All matches are finalized
        expect(todasPartidas.every((p) => p.status === "finalizada")).toBe(true);

        // Each match has a defined result
        for (const p of todasPartidas) {
            if (p.jogador2Id !== null) {
                // Non-BYE: exactly 3 games played (2-1 result)
                expect(p.vitoriasJogador1 + p.vitoriasJogador2).toBe(3);
            }
        }
    }, 30_000);
});
