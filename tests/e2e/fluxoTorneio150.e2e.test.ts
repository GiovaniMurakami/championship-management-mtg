/**
 * E2E: Torneio Swiss com 150 jogadores
 *
 * Fluxo completo com banco real (MongoDB Atlas) e endpoints HTTP reais via supertest.
 * Rate limiters são neutralizados para permitir o volume de requisições do teste.
 * Ably e EventEmitter de eventos são silenciados (sem efeitos colaterais externos).
 *
 * Execução: npx jest tests/e2e/fluxoTorneio150.e2e.test.ts --testTimeout=300000
 *
 * Suites auxiliares no mesmo arquivo:
 * - Ajuste de rodadas + encerramento antecipado
 * - Contestação com observação + maxRodadas acima do Swiss (ceil(log2(n)))
 */

// ─── Mocks devem vir antes de qualquer import ───────────────────────────────

jest.mock("../../src/middlewares/express/rateLimiter", () => {
    const passthrough = (_req: unknown, _res: unknown, next: () => void) => next();
    return {
        authRateLimiter: passthrough,
        refreshTokenRateLimiter: passthrough,
        accountRateLimiter: passthrough,
        deckRateLimiter: passthrough,
        inscricaoRateLimiter: passthrough,
        resultadoRateLimiter: passthrough,
        mutationRateLimiter: passthrough,
        torneioMutationRateLimiter: passthrough,
        publicReadRateLimiter: passthrough,
        torneioReadRateLimiter: passthrough,
        heavyReadRateLimiter: passthrough,
        publicActionRateLimiter: passthrough,
        uploadImagemRateLimiter: passthrough,
    };
});

jest.mock("../../src/infra/ably/notificacaoAbly", () => ({
    NotificacaoAbly: { iniciar: jest.fn() },
}));

jest.mock("../../src/infra/socketio/eventosTorneio", () => ({
    eventosTorneio: { emit: jest.fn(), on: jest.fn() },
}));

jest.mock("../../src/infra/services/emailServico", () => ({
    EmailServico: {
        criar: () => ({ enviar: jest.fn().mockResolvedValue(undefined) }),
    },
}));
import supertest from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Porta 0 → SO escolhe porta aleatória livre; evita conflito com servidor real
process.env.PORT = "0";
process.env.LOG_LEVEL = "silent";
// This suite silences the EventEmitter, so cloud cache invalidation cannot run.
process.env.DYNAMODB_CACHE_ENABLED = "false";
// Setup com 150 jogadores em paralelo precisa de pool > 1 (evita timeout no beforeAll)
const poolSize = Number(process.env.MONGODB_MAX_POOL_SIZE || "1");
if (!Number.isFinite(poolSize) || poolSize < 10) {
    process.env.MONGODB_MAX_POOL_SIZE = "20";
}

import { app } from "../../src/app";

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

interface PartidaInfo {
    id: string;
    rodada?: number;
    jogador1Id: string;
    jogador2Id: string | null;
    status?: string;
    vitoriasJogador1?: number;
    vitoriasJogador2?: number;
    confirmadoPor?: string[];
    contestado?: boolean;
    observacaoContestacao?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Processa array em lotes de `tamanho`, em paralelo dentro de cada lote. */
async function lote<T, R>(
    items: T[],
    tamanho: number,
    fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += tamanho) {
        const chunk = items.slice(i, i + tamanho);
        const chunkResults = await Promise.all(
            chunk.map((item, j) => fn(item, i + j))
        );
        results.push(...chunkResults);
    }
    return results;
}

// ─── Resultados possíveis em partidas Swiss (empates permitidos) ──────────────

const RESULTADOS_SWISS = [
    { vitoriasJogador1: 2, vitoriasJogador2: 0 },
    { vitoriasJogador1: 2, vitoriasJogador2: 1 },
    { vitoriasJogador1: 0, vitoriasJogador2: 2 },
    { vitoriasJogador1: 1, vitoriasJogador2: 2 },
    { vitoriasJogador1: 1, vitoriasJogador2: 1 },
];

function resultadoAleatorio() {
    return RESULTADOS_SWISS[Math.floor(Math.random() * RESULTADOS_SWISS.length)];
}

// ─── Deck mínimo válido (60 cartas no maindeck) ───────────────────────────────

const MAINDECK_VALIDO = [{ nome: "Island", quantidade: 60 }];

// ─── Suite ───────────────────────────────────────────────────────────────────

describe("E2E – Torneio Swiss 150 jogadores", () => {
    jest.setTimeout(600_000);

    const PREFIX = `e2e_${Date.now()}_`;
    const SENHA = "Senha@12345";
    const N_PLAYERS = 150;
    const LATE_PLAYERS = 4;
    const TOP_CUT_SIZE = 8;
    const TOTAL_INSCRITOS_FINAL = N_PLAYERS + LATE_PLAYERS;
    const TOTAL_DROPS_REALISTAS = 10;
    const TOTAL_ATIVOS_APOS_DROPS = TOTAL_INSCRITOS_FINAL - TOTAL_DROPS_REALISTAS;
    const TOTAL_PARTIDAS_SWISS = (75 * 5) + LATE_PLAYERS + ((TOTAL_ATIVOS_APOS_DROPS / 2) * 3);
    const TOTAL_PARTIDAS_TOP8 = 4 + 2 + 1;

    let req: ReturnType<typeof supertest>;

    // ── Estado compartilhado entre testes ─────────────────────────────────────
    let adminToken: string;
    let adminId: string;
    let torneioId: string;
    let playerIds: string[] = [];
    let playerTokens: string[] = [];
    const latePlayerIds: string[] = [];
    const latePlayerTokens: string[] = [];
    let rodadaPartidas: PartidaInfo[] = [];
    /** IDs dos jogadores dropados na Fase 4 — usados para filtrar partidas já resolvidas. */
    let droppedIds: string[] = [];
    /** IDs de partidas da rodada 5 pré-registradas fora do lote normal — excluídas da Fase 5. */
    const excludedPartidaIds: string[] = [];
    const confirmedPartidaIds: string[] = [];
    const contestedPartidaIds: string[] = [];
    let top8Ids: string[] = [];

    const tokenDoJogador = (jogadorId: string) => {
        const initialIdx = playerIds.indexOf(jogadorId);
        if (initialIdx >= 0) return playerTokens[initialIdx];
        const lateIdx = latePlayerIds.indexOf(jogadorId);
        if (lateIdx >= 0) return latePlayerTokens[lateIdx];
        throw new Error(`Token não encontrado para jogador ${jogadorId}`);
    };

    const criarDeckParaJogador = async (token: string, nome: string) => {
        const deckRes = await req
            .post("/deck/cadastrar")
            .set("Authorization", `Bearer ${token}`)
            .send({
                nome,
                formato: "Standard",
                maindeck: MAINDECK_VALIDO,
                sideboard: [],
            })
            .expect(201);
        return deckRes.body.id as string;
    };

    const registrarResultadoRealista = async (
        partida: PartidaInfo,
        seed: number,
        opcoes: { confirmar?: "um" | "ambos"; contestar?: boolean } = {}
    ) => {
        if (!partida.jogador2Id) return null;

        const resultadoOriginal = resultadoAleatorio();
        const reporterToken = seed % 3 === 0
            ? adminToken
            : tokenDoJogador(seed % 2 === 0 ? partida.jogador1Id : partida.jogador2Id);

        const registrado = await req
            .post(`/torneio/partida/${partida.id}/resultado`)
            .set("Authorization", `Bearer ${reporterToken}`)
            .send(resultadoOriginal)
            .expect(200);

        if (opcoes.contestar) {
            const contestadorToken = tokenDoJogador(seed % 2 === 0 ? partida.jogador2Id : partida.jogador1Id);
            const observacao = `Contestação e2e seed=${seed}`;
            const contestRes = await req
                .post(`/torneio/partida/${partida.id}/contestar`)
                .set("Authorization", `Bearer ${contestadorToken}`)
                .send({ observacao })
                .expect(200);
            expect(contestRes.body.contestado).toBe(true);
            expect(contestRes.body.observacaoContestacao).toBe(observacao);

            const resultadoAjustado = resultadoOriginal.vitoriasJogador1 === resultadoOriginal.vitoriasJogador2
                ? { vitoriasJogador1: 2, vitoriasJogador2: 1 }
                : {
                    vitoriasJogador1: resultadoOriginal.vitoriasJogador2,
                    vitoriasJogador2: resultadoOriginal.vitoriasJogador1,
                };
            const ajusteRes = await req
                .put(`/torneio/partida/${partida.id}/ajustar`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send(resultadoAjustado)
                .expect(200);
            expect(ajusteRes.body.contestado).toBe(false);
            expect(ajusteRes.body.status).toBe("finalizada");
            contestedPartidaIds.push(partida.id);
            return ajusteRes.body;
        }

        if (opcoes.confirmar) {
            const confirmaJ1 = await req
                .post(`/torneio/partida/${partida.id}/confirmar`)
                .set("Authorization", `Bearer ${tokenDoJogador(partida.jogador1Id)}`)
                .expect(200);
            expect(confirmaJ1.body.confirmadoPor).toContain(partida.jogador1Id);
            expect(confirmaJ1.body.confirmacao.count).toBeGreaterThanOrEqual(1);

            if (opcoes.confirmar === "ambos") {
                const confirmaJ2 = await req
                    .post(`/torneio/partida/${partida.id}/confirmar`)
                    .set("Authorization", `Bearer ${tokenDoJogador(partida.jogador2Id)}`)
                    .expect(200);
                expect(confirmaJ2.body.confirmadoPor).toEqual(
                    expect.arrayContaining([partida.jogador1Id, partida.jogador2Id])
                );
                expect(confirmaJ2.body.confirmacao.fullyConfirmed).toBe(true);
            }
            confirmedPartidaIds.push(partida.id);
        }

        return registrado.body;
    };

    // ── Setup global ───────────────────────────────────────────────────────────
    beforeAll(async () => {
        req = supertest(app());

        // 1. Registrar organizador
        const orgRes = await req
            .post("/usuario/cadastrar")
            .send({ nome: "Org E2E", email: `${PREFIX}org@test.com`, senha: SENHA })
            .expect(201);
        adminId = orgRes.body.id;

        // 2. Promover organizador para admin diretamente no MongoDB
        await mongoose.model("Usuario").updateOne(
            { id: adminId },
            { $set: { role: "admin" } }
        );

        // 3. Login do admin
        const adminLogin = await req
            .post("/usuario/login")
            .send({ email: `${PREFIX}org@test.com`, senha: SENHA })
            .expect(200);
        adminToken = adminLogin.body.token;

        // 4. Registrar 150 jogadores em lotes de 15
        const indices = Array.from({ length: N_PLAYERS }, (_, i) => i);
        playerIds = await lote(indices, 15, async (i) => {
            const res = await req
                .post("/usuario/cadastrar")
                .send({
                    nome: `Player E2E ${i}`,
                    email: `${PREFIX}player${i}@test.com`,
                    senha: SENHA,
                })
                .expect(201);
            return res.body.id as string;
        });

        // 5. Login de todos os jogadores em lotes de 15
        playerTokens = await lote(indices, 15, async (i) => {
            const res = await req
                .post("/usuario/login")
                .send({ email: `${PREFIX}player${i}@test.com`, senha: SENHA })
                .expect(200);
            return res.body.token as string;
        });

        // 6. Configurar nickMTGO (obrigatório para inscrição no torneio)
        await lote(indices, 15, async (i) => {
            await req
                .put("/usuario/atualizar")
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send({ nickMTGO: `e2eplayer${i}` })
                .expect(200);
        });

        // 7. Criar torneio (admin)
        const torneioRes = await req
            .post("/torneio/criar")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nome: `${PREFIX}Torneio 150`,
                horario: new Date(Date.now() + 3_600_000).toISOString(),
                formato: "Standard",
                maxJogadores: 160,
                maxRodadas: 8,
                corteTop: TOP_CUT_SIZE,
                exibirNomeJogador: "nickMOL",
            })
            .expect(201);
        torneioId = torneioRes.body.id;
        expect(torneioRes.body.exibirNomeJogador).toBe("nickMOL");

        // 8. Inscrever 150 jogadores
        await lote(indices, 15, async (i) => {
            await req
                .post(`/torneio/${torneioId}/inscrever`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send()
                .expect(201);
        });

        // 9. Cada jogador cria 1 deck e escolhe para o torneio
        await lote(indices, 15, async (i) => {
            const deckRes = await req
                .post("/deck/cadastrar")
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send({
                    nome: `${PREFIX}Deck ${i}`,
                    formato: "Standard",
                    maindeck: MAINDECK_VALIDO,
                    sideboard: [],
                })
                .expect(201);
            await req
                .post(`/torneio/${torneioId}/deck`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send({ deckId: deckRes.body.id })
                .expect(200);
        });

        // 10. Check-in inicial de todos os jogadores (checkInRodada: -1 → 0)
        await lote(indices, 15, async (i) => {
            await req
                .post(`/torneio/${torneioId}/checkin`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send()
                .expect(200);
        });
    }, 600_000);

    // ═══════════════════════════════════════════════════════════════════════════
    // Fase 1: Iniciar torneio
    // ═══════════════════════════════════════════════════════════════════════════

    it("deve iniciar o torneio com 150 jogadores e 75 partidas na rodada 1", async () => {
        const res = await req
            .post(`/torneio/${torneioId}/iniciar`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        expect(res.body.torneioId).toBe(torneioId);
        expect(res.body.rodadaAtual).toBe(1);
        expect(res.body.totalRodadas).toBeGreaterThanOrEqual(7);
        expect(res.body.partidas).toHaveLength(75);

        // Todos os jogadores referenciados pertencem ao set de inscritos
        const jogadoresNasPartidas = new Set<string>();
        for (const p of res.body.partidas as PartidaInfo[]) {
            jogadoresNasPartidas.add(p.jogador1Id);
            if (p.jogador2Id) jogadoresNasPartidas.add(p.jogador2Id);
        }
        expect(jogadoresNasPartidas.size).toBe(N_PLAYERS);

        rodadaPartidas = res.body.partidas as PartidaInfo[];
    });

    // ── Guardrails pós-início ─────────────────────────────────────────────────

    it("não deve permitir iniciar o torneio que já está em andamento", async () => {
        const res = await req
            .post(`/torneio/${torneioId}/iniciar`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(400);
        expect(res.body.mensagem).toBeDefined();
    });

    it("GET /torneio/:id deve expor estado completo do torneio em andamento", async () => {
        const res = await req
            .get(`/torneio/${torneioId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        expect(res.body.id).toBe(torneioId);
        expect(res.body.status).toBe("em_andamento");
        expect(res.body.rodadaAtual).toBe(1);
        expect(res.body.totalRodadas).toBe(8);
        expect(res.body.formato.toLowerCase()).toBe("standard");
        expect(res.body.totalInscritos).toBe(N_PLAYERS);
        expect(res.body.totalCheckin).toBe(N_PLAYERS);
        // partidas da rodada corrente estão incluídas
        expect(Array.isArray(res.body.partidas)).toBe(true);
        expect(res.body.partidas.length).toBe(75);
        // cada partida tem campos obrigatórios
        for (const p of res.body.partidas) {
            expect(p).toHaveProperty("id");
            expect(p).toHaveProperty("rodada");
            expect(p).toHaveProperty("jogador1Id");
            expect(p).toHaveProperty("jogador1Nome");
            expect(p).toHaveProperty("status");
            expect(p).toHaveProperty("contestado");
        }
    });

    it("GET /torneio/:id/partidas?rodada=1 deve retornar 75 partidas pendentes com schema correto", async () => {
        const res = await req
            .get(`/torneio/${torneioId}/partidas?rodada=1`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        expect(res.body.torneioId).toBe(torneioId);
        expect(res.body.partidas).toHaveLength(75);

        for (const p of res.body.partidas) {
            expect(p.status).toBe("pendente");
            expect(p.contestado).toBe(false);
            expect(p.rodada).toBe(1);
            expect(typeof p.jogador1Nome).toBe("string");
            expect(p.jogador1Nome.length).toBeGreaterThan(0);
            // jogador2 pode ser null (bye) mas nome acompanha
            if (p.jogador2Id !== null) {
                expect(typeof p.jogador2Nome).toBe("string");
            }
            // Torneio configurado com nickMOL
            expect(p.jogador1Nome).toMatch(/^e2eplayer\d+$/);
            if (p.jogador2Id !== null) {
                expect(p.jogador2Nome).toMatch(/^e2eplayer\d+$/);
            }
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // Fase 2: Rodadas 1–4
    // ═══════════════════════════════════════════════════════════════════════════

    it("deve completar as rodadas 1 a 4", async () => {
        const allIndices = Array.from({ length: N_PLAYERS }, (_, i) => i);

        for (let r = 1; r <= 4; r++) {
            const partidas = rodadaPartidas.filter((p) => p.jogador2Id !== null);
            await lote(partidas, 12, async (p, idx) => {
                await registrarResultadoRealista(p, r * 1000 + idx, {
                    confirmar: idx % 11 === 0 ? "ambos" : idx % 7 === 0 ? "um" : undefined,
                    contestar: idx % 19 === 0,
                });
            });

            // Check-in para a próxima rodada (checkInRodada: r-1 → r)
            await lote(allIndices, 15, async (i) => {
                await req
                    .post(`/torneio/${torneioId}/checkin`)
                    .set("Authorization", `Bearer ${playerTokens[i]}`)
                    .send()
                    .expect(200);
            });

            const avancRes = await req
                .post(`/torneio/${torneioId}/proxima-rodada`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            expect(avancRes.body.finalizado).toBe(false);
            rodadaPartidas = avancRes.body.partidas as PartidaInfo[];

            if (r === 4) {
                expect(avancRes.body.rodadaAtual).toBe(5);
                // 150 jogadores pares → 75 partidas na rodada 5
                expect(rodadaPartidas).toHaveLength(75);
            }
        }
    });

    // ── Guardrails pós-rodadas 1-4 (rodada 5 com partidas pendentes) ──────────

    it("deve refazer a rodada atual e permitir gerar os pareamentos novamente", async () => {
        const idsRodadaOriginal = new Set(rodadaPartidas.map((p) => p.id));

        const refazerRes = await req
            .post(`/torneio/${torneioId}/refazer-rodada`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        expect(refazerRes.body.rodadaAtual).toBe(4);
        expect(refazerRes.body.rodadaRemovida).toBe(5);
        expect(refazerRes.body.partidasRemovidas).toBe(75);
        expect(refazerRes.body.emCorte).toBe(false);
        expect(refazerRes.body.totalRodadas).toBe(8);

        const rodadaRemovida = await req
            .get(`/torneio/${torneioId}/partidas?rodada=5`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(rodadaRemovida.body.partidas).toHaveLength(0);

        const recriarRes = await req
            .post(`/torneio/${torneioId}/proxima-rodada`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        expect(recriarRes.body.finalizado).toBe(false);
        expect(recriarRes.body.rodadaAtual).toBe(5);
        expect(recriarRes.body.emCorte).toBe(false);
        expect(recriarRes.body.partidas).toHaveLength(75);
        rodadaPartidas = recriarRes.body.partidas as PartidaInfo[];
        expect(rodadaPartidas.every((p) => !idsRodadaOriginal.has(p.id))).toBe(true);
    });

    it("deve aumentar e reduzir o total de rodadas Swiss durante a rodada 5", async () => {
        const aumentarRes = await req
            .put(`/torneio/${torneioId}/total-rodadas`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ totalRodadas: 9 })
            .expect(200);

        expect(aumentarRes.body.totalRodadasAnterior).toBe(8);
        expect(aumentarRes.body.totalRodadas).toBe(9);
        expect(aumentarRes.body.rodadaAtual).toBe(5);
        expect(aumentarRes.body.emCorte).toBe(false);

        const reduzirRes = await req
            .put(`/torneio/${torneioId}/total-rodadas`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ totalRodadas: 8 })
            .expect(200);

        expect(reduzirRes.body.totalRodadasAnterior).toBe(9);
        expect(reduzirRes.body.totalRodadas).toBe(8);

        const rejeitaAbaixoDaAtual = await req
            .put(`/torneio/${torneioId}/total-rodadas`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ totalRodadas: 4 })
            .expect(400);
        expect(rejeitaAbaixoDaAtual.body.mensagem).toMatch(/rodada atual/i);

        const rejeitaJogador = await req
            .put(`/torneio/${torneioId}/total-rodadas`)
            .set("Authorization", `Bearer ${playerTokens[0]}`)
            .send({ totalRodadas: 9 })
            .expect(403);
        expect(rejeitaJogador.body.mensagem).toBeDefined();
    });

    it("não deve avançar rodada com resultados ainda pendentes", async () => {
        // Todas as 75 partidas da rodada 5 estão pendentes
        const res = await req
            .post(`/torneio/${torneioId}/proxima-rodada`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(400);
        expect(res.body.mensagem).toMatch(/pendente/i);
    });

    it("resultado com placar inválido deve retornar 400", async () => {
        // v1 + v2 = 4 → inválido (max 3 games num melhor de 3)
        const partida = rodadaPartidas.find((p) => p.jogador2Id !== null)!;
        const res = await req
            .post(`/torneio/partida/${partida.id}/resultado`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ vitoriasJogador1: 3, vitoriasJogador2: 1 })
            .expect(400);
        expect(res.body.mensagem).toBeDefined();
    });

    it("jogador não envolvido na partida não deve conseguir registrar o resultado", async () => {
        const player0Id = playerIds[0];
        // Partida onde player[0] não é jogador
        const alheiaAoPlayer0 = rodadaPartidas.find(
            (p) => p.jogador2Id !== null && p.jogador1Id !== player0Id && p.jogador2Id !== player0Id
        )!;
        const res = await req
            .post(`/torneio/partida/${alheiaAoPlayer0.id}/resultado`)
            .set("Authorization", `Bearer ${playerTokens[0]}`)
            .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
            .expect(403);
        expect(res.body.mensagem).toBeDefined();
    });

    it("não deve registrar resultado duas vezes na mesma partida", async () => {
        // Registrar uma partida pendente
        const partida = rodadaPartidas.find((p) => p.jogador2Id !== null)!;
        await req
            .post(`/torneio/partida/${partida.id}/resultado`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
            .expect(200);
        // Segunda tentativa na mesma partida → 400
        const res = await req
            .post(`/torneio/partida/${partida.id}/resultado`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
            .expect(400);
        expect(res.body.mensagem).toMatch(/já teve o resultado registrado/i);
        // Guardamos para que Fase 5 não tente registrá-la novamente.
        excludedPartidaIds.push(partida.id);
    });

    it("deve permitir ingresso tardio de jogadores durante a rodada 5", async () => {
        for (let i = 0; i < LATE_PLAYERS; i++) {
            const cadastro = await req
                .post("/usuario/cadastrar")
                .send({
                    nome: `Late Player E2E ${i}`,
                    email: `${PREFIX}late${i}@test.com`,
                    senha: SENHA,
                })
                .expect(201);

            const login = await req
                .post("/usuario/login")
                .send({ email: `${PREFIX}late${i}@test.com`, senha: SENHA })
                .expect(200);

            await req
                .put("/usuario/atualizar")
                .set("Authorization", `Bearer ${login.body.token}`)
                .send({ nickMTGO: `e2elate${i}` })
                .expect(200);

            const deckId = await criarDeckParaJogador(login.body.token, `${PREFIX}Late Deck ${i}`);
            const linkRes = await req
                .post(`/torneio/${torneioId}/gerar-link-ingresso`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ validadeHoras: 2 })
                .expect(201);

            const ingresso = await req
                .post(`/torneio/ingressar/${linkRes.body.token}`)
                .set("Authorization", `Bearer ${login.body.token}`)
                .send({ deckId })
                .expect(201);

            expect(ingresso.body.usuarioId).toBe(cadastro.body.id);
            expect(ingresso.body.rodada).toBe(5);
            expect(ingresso.body.vitoriasJogador1).toBe(0);
            expect(ingresso.body.vitoriasJogador2).toBe(2);

            latePlayerIds.push(cadastro.body.id);
            latePlayerTokens.push(login.body.token);

            const reusoLinkRes = await req
                .post(`/torneio/ingressar/${linkRes.body.token}`)
                .set("Authorization", `Bearer ${login.body.token}`)
                .send({ deckId });
            expect([400, 404]).toContain(reusoLinkRes.status);
        }

        const partidasR5 = await req
            .get(`/torneio/${torneioId}/partidas?rodada=5`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        rodadaPartidas = partidasR5.body.partidas as PartidaInfo[];
        expect(latePlayerIds).toHaveLength(LATE_PLAYERS);
        expect(rodadaPartidas).toHaveLength(75 + LATE_PLAYERS);

        for (const lateId of latePlayerIds) {
            const partidaPenalidade = rodadaPartidas.find((p) => p.jogador1Id === lateId);
            expect(partidaPenalidade).toBeDefined();
            expect(partidaPenalidade!.jogador2Id).toBeNull();
            expect(partidaPenalidade!.status).toBe("finalizada");
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // Fase 3: Standings intermediários (rodada 5 já criada → 4 rodadas contabilizadas)
    // ═══════════════════════════════════════════════════════════════════════════

    it("deve retornar standings com jogadores iniciais e tardios após 4 rodadas consolidadas", async () => {
        const res = await req
            .get(`/torneio/${torneioId}/standings`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        const { standings } = res.body;
        expect(standings).toHaveLength(TOTAL_INSCRITOS_FINAL);

        // Posição 1 deve existir e ter pontuação >= 0
        const lider = standings[0];
        expect(lider.posicao).toBe(1);
        expect(lider.pontosMesa).toBeGreaterThanOrEqual(0);

        // Standings em ordem não-decrescente de posição
        for (let i = 0; i < standings.length - 1; i++) {
            expect(standings[i].posicao).toBeLessThanOrEqual(standings[i + 1].posicao);
        }

        // Nenhum droppado ainda
        expect(standings.every((e: { dropped: boolean }) => !e.dropped)).toBe(true);

        // Todos têm campos obrigatórios e tipos corretos
        for (const entry of standings) {
            expect(entry).toHaveProperty("posicao");
            expect(entry).toHaveProperty("usuario");
            expect(typeof entry.usuario.id).toBe("string");
            expect(typeof entry.usuario.nome).toBe("string");
            expect(typeof entry.pontosMesa).toBe("number");
            expect(typeof entry.omwp).toBe("number");
            expect(typeof entry.gwp).toBe("number");
            expect(typeof entry.ogwp).toBe("number");
            expect(typeof entry.checkInRodada).toBe("number");
            // Percentuais dentro do intervalo [0, 1]
            expect(entry.omwp).toBeGreaterThanOrEqual(0);
            expect(entry.omwp).toBeLessThanOrEqual(1);
            expect(entry.gwp).toBeGreaterThanOrEqual(0);
            expect(entry.gwp).toBeLessThanOrEqual(1);
            // Nome exibido = nick MTGO (exibirNomeJogador: nickMOL)
            expect(entry.usuario.nome).toMatch(/^e2e(player|late)\d+$/);
        }

        // `rodadaIniciadaEm` no formato ISO com offset -03:00 (Brasília)
        expect(res.body.rodadaIniciadaEm).toMatch(/-03:00$/);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // Fase 4: Jogadores aleatórios somem e são dropados
    // ═══════════════════════════════════════════════════════════════════════════

    it("deve dropar 10 jogadores iniciais que sumiram antes de reportar a rodada 5", async () => {
        const standingsRes = await req
            .get(`/torneio/${torneioId}/standings`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        const standings: Array<{ usuario: { id: string; nome: string }; posicao: number }> =
            standingsRes.body.standings;

        const ausentes = standings
            .filter((entry) => playerIds.includes(entry.usuario.id))
            .filter((_, idx) => idx % 9 === 0)
            .slice(0, TOTAL_DROPS_REALISTAS);
        expect(ausentes).toHaveLength(TOTAL_DROPS_REALISTAS);
        droppedIds = ausentes.map((entry) => entry.usuario.id);

        const dropResults = await Promise.all(
            ausentes.map((entry) =>
                req
                    .post(`/torneio/${torneioId}/drop`)
                    .set("Authorization", `Bearer ${adminToken}`)
                    .send({ jogadorId: entry.usuario.id })
                    .expect(200)
            )
        );

        // Cada resposta confirma que dropped=true e retorna o jogador correto
        for (let i = 0; i < dropResults.length; i++) {
            expect(dropResults[i].body.dropped).toBe(true);
            expect(dropResults[i].body.jogador.id).toBe(droppedIds[i]);
        }
    });

    // ── Guardrails pós-drop ───────────────────────────────────────────────────

    it("não deve dropar o mesmo jogador duas vezes", async () => {
        const res = await req
            .post(`/torneio/${torneioId}/drop`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ jogadorId: droppedIds[0] })
            .expect(400);
        expect(res.body.mensagem).toMatch(/já foi dropado/i);
    });

    it("deve permitir contestar resultado de partida da rodada 5 e admin ajustar corretamente", async () => {
        const droppedSet = new Set(droppedIds);

        // Partida pendente da rodada 5 sem jogadores dropados e sem as que já registramos
        const excludedSet = new Set(excludedPartidaIds);
        const alvo = rodadaPartidas.find(
            (p) =>
                p.jogador2Id !== null &&
                !droppedSet.has(p.jogador1Id) &&
                !droppedSet.has(p.jogador2Id) &&
                !excludedSet.has(p.id)
        )!;
        expect(alvo).toBeDefined();

        const idxJ2 = playerIds.indexOf(alvo.jogador2Id!);
        expect(idxJ2).toBeGreaterThanOrEqual(0);

        // Admin registra 2-0 para jogador 1
        await req
            .post(`/torneio/partida/${alvo.id}/resultado`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
            .expect(200);

        // Jogador 2 contesta com observação
        const observacao = "Placar reportado invertido no e2e";
        const contestRes = await req
            .post(`/torneio/partida/${alvo.id}/contestar`)
            .set("Authorization", `Bearer ${playerTokens[idxJ2]}`)
            .send({ observacao })
            .expect(200);
        expect(contestRes.body.contestado).toBe(true);
        expect(contestRes.body.observacaoContestacao).toBe(observacao);
        expect(contestRes.body.vitoriasJogador1).toBe(2);
        expect(contestRes.body.vitoriasJogador2).toBe(0);

        // Admin ajusta para 0-2 (jogador 2 na verdade ganhou)
        const ajusteRes = await req
            .put(`/torneio/partida/${alvo.id}/ajustar`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ vitoriasJogador1: 0, vitoriasJogador2: 2 })
            .expect(200);
        expect(ajusteRes.body.contestado).toBe(false);
        expect(ajusteRes.body.vitoriasJogador1).toBe(0);
        expect(ajusteRes.body.vitoriasJogador2).toBe(2);
        expect(ajusteRes.body.status).toBe("finalizada");

        // Salva para que Fase 5 não tente registrar esta partida novamente.
        excludedPartidaIds.push(alvo.id);
    });

    it("não deve contestar partida de rodada anterior quando rodadas subsequentes já existem", async () => {
        // Pega qualquer partida da rodada 1 (round 2..5 já foram criados, então existeRodadaPosterior=true)
        const listR1 = await req
            .get(`/torneio/${torneioId}/partidas?rodada=1`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        const partidaR1 = listR1.body.partidas.find((p: { jogador2Id: string | null }) => p.jogador2Id !== null);
        const res = await req
            .post(`/torneio/partida/${partidaR1.id}/contestar`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(400);
        expect(res.body.mensagem).toMatch(/rodadas subsequentes/i);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // Fase 5: Rodadas 5–8, corte Top 8 e finalização
    // ═══════════════════════════════════════════════════════════════════════════

    it("deve completar rodadas 5-8, iniciar o corte Top 8 e finalizar o torneio", async () => {
        const droppedSet = new Set(droppedIds);

        // Jogadores ativos (não dropados), incluindo os que entraram tardiamente.
        const activeIndices = Array.from({ length: N_PLAYERS }, (_, i) => i)
            .filter((i) => !droppedSet.has(playerIds[i]));
        const activePlayers = [
            ...activeIndices.map((i) => ({ id: playerIds[i], token: playerTokens[i], late: false })),
            ...latePlayerIds
                .map((id, idx) => ({ id, token: latePlayerTokens[idx] }))
                .filter((player) => !droppedSet.has(player.id))
                .map((player) => ({ ...player, late: true })),
        ];
        expect(activePlayers).toHaveLength(TOTAL_ATIVOS_APOS_DROPS);

        for (let r = 5; r <= 8; r++) {
            // Excluir: byes, partidas de dropados (auto-resolvidas) e as pré-registradas manualmente
            const excludedSet = new Set(excludedPartidaIds);
            const partidas = rodadaPartidas.filter(
                (p) =>
                    p.jogador2Id !== null &&
                    p.status !== "finalizada" &&
                    !droppedSet.has(p.jogador1Id) &&
                    !droppedSet.has(p.jogador2Id) &&
                    !excludedSet.has(p.id)
            );

            await lote(partidas, 12, async (p, idx) => {
                await registrarResultadoRealista(p, r * 1000 + idx, {
                    confirmar: idx % 13 === 0 ? "ambos" : idx % 5 === 0 ? "um" : undefined,
                    contestar: idx % 23 === 0,
                });
            });

            if (r < 8) {
                // Check-in dos jogadores ativos para a próxima rodada
                const jogadoresParaCheckin = r === 5
                    ? activePlayers.filter((player) => !player.late)
                    : activePlayers;
                await lote(jogadoresParaCheckin, 15, async (player) => {
                    await req
                        .post(`/torneio/${torneioId}/checkin`)
                        .set("Authorization", `Bearer ${player.token}`)
                        .send()
                        .expect(200);
                });
            }

            const avancRes = await req
                .post(`/torneio/${torneioId}/proxima-rodada`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            if (r < 8) {
                expect(avancRes.body.finalizado).toBe(false);
                rodadaPartidas = avancRes.body.partidas as PartidaInfo[];
                // Rodada 6 em diante: apenas os ativos, incluindo tardios que não sumiram
                if (r === 5) {
                    expect(avancRes.body.rodadaAtual).toBe(6);
                    // 144 jogadores pares → 72 partidas
                    expect(avancRes.body.partidas).toHaveLength(TOTAL_ATIVOS_APOS_DROPS / 2);
                }
                // Nenhum dropado deve aparecer nas novas partidas
                for (const p of rodadaPartidas) {
                    expect(droppedSet.has(p.jogador1Id)).toBe(false);
                    if (p.jogador2Id) expect(droppedSet.has(p.jogador2Id)).toBe(false);
                }
            } else {
                expect(avancRes.body.finalizado).toBe(false);
                expect(avancRes.body.rodadaAtual).toBe(9);
                expect(avancRes.body.emCorte).toBe(true);
                expect(avancRes.body.partidas).toHaveLength(TOP_CUT_SIZE / 2);

                rodadaPartidas = avancRes.body.partidas as PartidaInfo[];
                top8Ids = Array.from(new Set(
                    rodadaPartidas.flatMap((p) => [p.jogador1Id, p.jogador2Id].filter(Boolean) as string[])
                ));
                expect(top8Ids).toHaveLength(TOP_CUT_SIZE);

                const top8View = await req
                    .get(`/torneio/${torneioId}`)
                    .set("Authorization", `Bearer ${tokenDoJogador(top8Ids[0])}`)
                    .expect(200);
                expect(top8View.body.status).toBe("em_andamento");
                expect(top8View.body.emCorte).toBe(true);
                expect(top8View.body.corteTop).toBe(TOP_CUT_SIZE);
                expect(top8View.body.rodadaAtual).toBe(9);
                expect(top8View.body.totalRodadas).toBe(11);
                const partidasTop8ViewRodadaAtual = (top8View.body.partidas as PartidaInfo[])
                    .filter((p) => p.rodada === 9);
                expect(partidasTop8ViewRodadaAtual).toHaveLength(TOP_CUT_SIZE / 2);
                expect(
                    partidasTop8ViewRodadaAtual.some(
                        (p: PartidaInfo) => p.jogador1Id === top8Ids[0] || p.jogador2Id === top8Ids[0]
                    )
                ).toBe(true);
            }
        }

        for (let rodadaCorte = 9; rodadaCorte <= 11; rodadaCorte++) {
            const partidasCorte = rodadaPartidas.filter((p) => p.jogador2Id !== null);
            const partidasEsperadas = rodadaCorte === 9 ? 4 : rodadaCorte === 10 ? 2 : 1;
            expect(partidasCorte).toHaveLength(partidasEsperadas);

            await lote(partidasCorte, 4, async (p, idx) => {
                const vencedorEsquerda = idx % 2 === 0;
                await req
                    .post(`/torneio/partida/${p.id}/resultado`)
                    .set("Authorization", `Bearer ${adminToken}`)
                    .send({
                        vitoriasJogador1: vencedorEsquerda ? 2 : 0,
                        vitoriasJogador2: vencedorEsquerda ? 0 : 2,
                    })
                    .expect(200);
            });

            const avancCorteRes = await req
                .post(`/torneio/${torneioId}/proxima-rodada`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);

            if (rodadaCorte < 11) {
                expect(avancCorteRes.body.finalizado).toBe(false);
                expect(avancCorteRes.body.rodadaAtual).toBe(rodadaCorte + 1);
                expect(avancCorteRes.body.emCorte).toBe(true);
                expect(avancCorteRes.body.partidas).toHaveLength(partidasEsperadas / 2);
                rodadaPartidas = avancCorteRes.body.partidas as PartidaInfo[];
            } else {
                expect(avancCorteRes.body.finalizado).toBe(true);
                expect(Array.isArray(avancCorteRes.body.classificacao)).toBe(true);
                expect(avancCorteRes.body.classificacao.length).toBeGreaterThan(0);
                for (let i = 0; i < avancCorteRes.body.classificacao.length - 1; i++) {
                    expect(avancCorteRes.body.classificacao[i].posicao)
                        .toBeLessThanOrEqual(avancCorteRes.body.classificacao[i + 1].posicao);
                }
            }
        }
    });

    // ── Guardrails pós-finalização ────────────────────────────────────────────

    it("não deve fazer check-in em torneio finalizado", async () => {
        const res = await req
            .post(`/torneio/${torneioId}/checkin`)
            .set("Authorization", `Bearer ${playerTokens[0]}`)
            .expect(400);
        expect(res.body.mensagem).toMatch(/finalizado/i);
    });

    it("não deve dropar jogador em torneio finalizado", async () => {
        const activeId = playerIds.find((id) => !droppedIds.includes(id))!;
        const res = await req
            .post(`/torneio/${torneioId}/drop`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ jogadorId: activeId })
            .expect(400);
        expect(res.body.mensagem).toMatch(/finalizado/i);
    });

    it("não deve registrar resultado em torneio finalizado", async () => {
        // Usa qualquer partida do torneio (todas já finalizadas)
        const qualquerPartida = rodadaPartidas[0];
        const res = await req
            .post(`/torneio/partida/${qualquerPartida.id}/resultado`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
            .expect(400);
        expect(res.body.mensagem).toMatch(/em andamento/i);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // Fase 6: Standings finais
    // ═══════════════════════════════════════════════════════════════════════════

    it("deve retornar standings finais com todos os jogadores ordenados", async () => {
        const res = await req
            .get(`/torneio/${torneioId}/standings`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        const { standings } = res.body;

        // Todos os jogadores, incluindo tardios e droppados.
        expect(standings).toHaveLength(TOTAL_INSCRITOS_FINAL);

        // Posições não-decrescentes
        for (let i = 0; i < standings.length - 1; i++) {
            expect(standings[i].posicao).toBeLessThanOrEqual(standings[i + 1].posicao);
        }

        // Exatamente 10 droppados
        const droppados = standings.filter((e: { dropped?: boolean }) => e.dropped === true);
        expect(droppados.length).toBe(TOTAL_DROPS_REALISTAS);
        // Os IDs dos droppados batem com os que registramos
        const droppedIdsNoStandings = droppados.map((e: { usuario: { id: string } }) => e.usuario.id);
        for (const id of droppedIds) {
            expect(droppedIdsNoStandings).toContain(id);
        }
        for (const id of latePlayerIds) {
            const lateEntry = standings.find((e: { usuario: { id: string } }) => e.usuario.id === id);
            expect(lateEntry).toBeDefined();
            expect(lateEntry!.dropped).toBe(false);
        }

        // Líder geral tem pontos >= quaisquer outros
        const naoDroppados = standings.filter((e: { dropped?: boolean }) => !e.dropped);
        expect(naoDroppados[0].pontosMesa).toBeGreaterThanOrEqual(
            naoDroppados[naoDroppados.length - 1].pontosMesa
        );

        // Todos os campos obrigatórios presentes
        for (const entry of standings) {
            expect(entry).toHaveProperty("posicao");
            expect(entry.usuario).toHaveProperty("id");
            expect(entry.usuario).toHaveProperty("nome");
            expect(entry).toHaveProperty("pontosMesa");
            expect(entry).toHaveProperty("omwp");
            expect(entry).toHaveProperty("gwp");
            expect(entry).toHaveProperty("ogwp");
            expect(entry).toHaveProperty("dropped");
            // mwp implícito: pontos válidos
            expect(entry.pontosMesa).toBeGreaterThanOrEqual(0);
            // Percentuais dentro de [0, 1]
            expect(entry.omwp).toBeGreaterThanOrEqual(0);
            expect(entry.omwp).toBeLessThanOrEqual(1);
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // Consultas finais (read-only, torneio finalizado)
    // ═══════════════════════════════════════════════════════════════════════════

    it("GET /torneio/:id deve exibir status finalizado com campos completos", async () => {
        const res = await req
            .get(`/torneio/${torneioId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        expect(res.body.status).toBe("finalizado");
        expect(res.body.rodadaAtual).toBe(11);
        expect(res.body.totalRodadas).toBe(11);
        expect(res.body.emCorte).toBe(true);
        expect(res.body.corteTop).toBe(TOP_CUT_SIZE);
        expect(res.body.totalInscritos).toBe(TOTAL_INSCRITOS_FINAL);
        // Todas as partidas do torneio são retornadas no GET /torneio/:id
        expect(res.body.partidas.length).toBe(TOTAL_PARTIDAS_SWISS + TOTAL_PARTIDAS_TOP8);
        // Nenhuma partida deve estar pendente ao final
        const pendentes = res.body.partidas.filter((p: { status: string }) => p.status === "pendente");
        expect(pendentes).toHaveLength(0);
    });

    it("GET /torneio/:id/partidas sem filtro deve retornar todas as partidas do torneio", async () => {
        const res = await req
            .get(`/torneio/${torneioId}/partidas`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        expect(res.body.torneioId).toBe(torneioId);
        expect(res.body.partidas).toHaveLength(TOTAL_PARTIDAS_SWISS + TOTAL_PARTIDAS_TOP8);

        // Todas finalizadas
        for (const p of res.body.partidas) {
            expect(p.status).toBe("finalizada");
        }

        // A partida ajustada (2ª no excludedPartidaIds) deve ter resultado 0-2 após ajuste
        const ajusteId = excludedPartidaIds[1]; // [0]=duplicada, [1]=contestada+ajustada
        const ajustada = ajusteId ? res.body.partidas.find((p: { id: string }) => p.id === ajusteId) : null;
        if (ajustada) {
            expect(ajustada.vitoriasJogador1).toBe(0);
            expect(ajustada.vitoriasJogador2).toBe(2);
            expect(ajustada.contestado).toBe(false);
        }
    });

    it("GET /torneio/:id/partidas?rodada=X deve retornar apenas as partidas daquela rodada", async () => {
        // Rodadas 1-4: 75 partidas cada
        for (const rodada of [1, 2, 3, 4]) {
            const res = await req
                .get(`/torneio/${torneioId}/partidas?rodada=${rodada}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);
            expect(res.body.partidas).toHaveLength(75);
            for (const p of res.body.partidas) {
                expect(p.rodada).toBe(rodada);
            }
        }

        const rodada5 = await req
            .get(`/torneio/${torneioId}/partidas?rodada=5`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(rodada5.body.partidas).toHaveLength(75 + LATE_PLAYERS);
        for (const p of rodada5.body.partidas) {
            expect(p.rodada).toBe(5);
        }

        // Rodadas 6-8: 72 partidas cada
        for (const rodada of [6, 7, 8]) {
            const res = await req
                .get(`/torneio/${torneioId}/partidas?rodada=${rodada}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);
            expect(res.body.partidas).toHaveLength(TOTAL_ATIVOS_APOS_DROPS / 2);
            for (const p of res.body.partidas) {
                expect(p.rodada).toBe(rodada);
            }
        }

        for (const [rodada, totalEsperado] of [[9, 4], [10, 2], [11, 1]] as const) {
            const res = await req
                .get(`/torneio/${torneioId}/partidas?rodada=${rodada}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);
            expect(res.body.partidas).toHaveLength(totalEsperado);
            for (const p of res.body.partidas) {
                expect(p.rodada).toBe(rodada);
            }
        }
    });

    it("GET /torneio/:id/meu-historico deve retornar as 8 partidas do jogador com campos corretos", async () => {
        // Escolhe um jogador que não foi dropado nem entrou no corte Top 8.
        const nonDroppedIdx = Array.from({ length: N_PLAYERS }, (_, i) => i)
            .find((i) => !droppedIds.includes(playerIds[i]) && !top8Ids.includes(playerIds[i]))!;

        const res = await req
            .get(`/torneio/${torneioId}/meu-historico`)
            .set("Authorization", `Bearer ${playerTokens[nonDroppedIdx]}`)
            .expect(200);

        expect(res.body.torneioId).toBe(torneioId);
        expect(res.body.usuario.id).toBe(playerIds[nonDroppedIdx]);
        expect(res.body.partidas).toHaveLength(8);

        const resultadosValidos = new Set(["vitoria", "derrota", "empate", "bye"]);
        for (const p of res.body.partidas) {
            expect(typeof p.id).toBe("string");
            expect(typeof p.rodada).toBe("number");
            expect(p.status).toBe("finalizada");
            expect(resultadosValidos.has(p.resultado)).toBe(true);
            expect(typeof p.vitoriasJogador).toBe("number");
            expect(typeof p.vitoriasOponente).toBe("number");
            // Oponente presente (nenhum bye em 150/140 players sempre pares)
            expect(p.oponente).not.toBeNull();
            expect(typeof p.oponente.id).toBe("string");
            expect(typeof p.oponente.nome).toBe("string");
        }

        // Rodadas são únicas e cobrindo 1..8
        const rodadas = res.body.partidas.map((p: { rodada: number }) => p.rodada).sort((a: number, b: number) => a - b);
        expect(rodadas).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("GET /torneio/:id/meu-historico de jogador dropado deve ter 5 partidas (4 normais + WO rodada 5)", async () => {
        const droppedIdx = playerIds.indexOf(droppedIds[0]);
        const res = await req
            .get(`/torneio/${torneioId}/meu-historico`)
            .set("Authorization", `Bearer ${playerTokens[droppedIdx]}`)
            .expect(200);

        expect(res.body.partidas).toHaveLength(5);
        // Partidas apenas das rodadas 1-5 (nunca participou das rodadas 6-8)
        const rodadasJogadas: number[] = res.body.partidas.map((p: { rodada: number }) => p.rodada);
        expect(rodadasJogadas.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
        // A partida da rodada 5 está finalizada (WO ou pré-registrada)
        const r5 = res.body.partidas.find((p: { rodada: number }) => p.rodada === 5)!;
        expect(r5.status).toBe("finalizada");
        // O total de vitórias na partida corresponde a um resultado válido (2-0, 2-1, 1-1, etc.)
        const totalVitorias = r5.vitoriasJogador + r5.vitoriasOponente;
        expect(totalVitorias).toBeGreaterThanOrEqual(0);
        expect(totalVitorias).toBeLessThanOrEqual(3);
    });

    // ── Limpeza ────────────────────────────────────────────────────────────────
    afterAll(async () => {
        if (!torneioId) {
            await mongoose.disconnect();
            return;
        }

        const emailRegex = new RegExp(`^${PREFIX.replace(/_/g, "_")}`);

        await mongoose.model("Partida").deleteMany({ torneioId });
        await mongoose.model("Inscricao").deleteMany({ torneioId });
        await mongoose.model("Torneio").deleteMany({ id: torneioId });
        await mongoose.model("Deck").deleteMany({
            usuarioId: { $in: [adminId, ...playerIds] },
        });
        await mongoose.model("Usuario").deleteMany({ email: emailRegex });

        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }, 60_000);
});

/**
 * E2E menor: cobre ajuste de rodadas + encerramento antecipado sem corte.
 * Separado do fluxo 150 para não interferir nas expectativas de Top 8.
 */
describe("E2E – Ajuste de rodadas e encerramento antecipado", () => {
    jest.setTimeout(120_000);

    const PREFIX = `e2e_end_${Date.now()}_`;
    const SENHA = "Senha@12345";
    const N = 4;

    let req: ReturnType<typeof supertest>;
    let adminToken: string;
    let adminId: string;
    let torneioId: string;
    let playerIds: string[] = [];
    let playerTokens: string[] = [];

    beforeAll(async () => {
        req = supertest(app());

        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI as string);
        }

        const orgRes = await req
            .post("/usuario/cadastrar")
            .send({ nome: "Org End", email: `${PREFIX}org@end.com`, senha: SENHA })
            .expect(201);
        adminId = orgRes.body.id;
        await mongoose.model("Usuario").updateOne({ id: adminId }, { $set: { role: "admin" } });

        const adminLogin = await req
            .post("/usuario/login")
            .send({ email: `${PREFIX}org@end.com`, senha: SENHA })
            .expect(200);
        adminToken = adminLogin.body.token;

        const indices = Array.from({ length: N }, (_, i) => i);
        playerIds = await lote(indices, 4, async (i) => {
            const res = await req
                .post("/usuario/cadastrar")
                .send({
                    nome: `End Player ${i}`,
                    email: `${PREFIX}p${i}@end.com`,
                    senha: SENHA,
                })
                .expect(201);
            return res.body.id as string;
        });

        playerTokens = await lote(indices, 4, async (i) => {
            const res = await req
                .post("/usuario/login")
                .send({ email: `${PREFIX}p${i}@end.com`, senha: SENHA })
                .expect(200);
            return res.body.token as string;
        });

        await lote(indices, 4, async (i) => {
            await req
                .put("/usuario/atualizar")
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send({ nickMTGO: `endnick${i}` })
                .expect(200);
        });

        const torneioRes = await req
            .post("/torneio/criar")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nome: `${PREFIX}Encerrar cedo`,
                horario: new Date(Date.now() + 3_600_000).toISOString(),
                formato: "Standard",
                maxJogadores: 8,
                maxRodadas: 4,
                exibirNomeJogador: "nickMOL",
            })
            .expect(201);
        torneioId = torneioRes.body.id;

        await lote(indices, 4, async (i) => {
            await req
                .post(`/torneio/${torneioId}/inscrever`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send()
                .expect(201);

            const deckRes = await req
                .post("/deck/cadastrar")
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send({
                    nome: `${PREFIX}Deck ${i}`,
                    formato: "Standard",
                    maindeck: MAINDECK_VALIDO,
                    sideboard: [],
                })
                .expect(201);

            await req
                .post(`/torneio/${torneioId}/deck`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send({ deckId: deckRes.body.id })
                .expect(200);

            await req
                .post(`/torneio/${torneioId}/checkin`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send()
                .expect(200);
        });
    }, 60_000);

    it("deve iniciar, forçar menos rodadas Swiss e encerrar sem corte", async () => {
        const startRes = await req
            .post(`/torneio/${torneioId}/iniciar`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        expect(startRes.body.rodadaAtual).toBe(1);
        // 4 jogadores → ceil(log2(4))=2; maxRodadas=4 força o total acima do Swiss
        expect(startRes.body.totalRodadas).toBe(4);
        const partidas = startRes.body.partidas as PartidaInfo[];
        expect(partidas).toHaveLength(2);
        expect(partidas[0].jogador1Nome).toMatch(/^endnick\d+$/);

        const totalOriginal = startRes.body.totalRodadas as number;

        const ajustarRes = await req
            .put(`/torneio/${torneioId}/total-rodadas`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ totalRodadas: 1 })
            .expect(200);
        expect(ajustarRes.body.totalRodadas).toBe(1);
        expect(ajustarRes.body.totalRodadasAnterior).toBe(totalOriginal);

        for (const p of partidas.filter((x) => x.jogador2Id !== null)) {
            await req
                .post(`/torneio/partida/${p.id}/resultado`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
                .expect(200);
        }

        const encerrarRes = await req
            .post(`/torneio/${torneioId}/encerrar`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        expect(encerrarRes.body.finalizado).toBe(true);
        expect(encerrarRes.body.status).toBe("finalizado");
        expect(encerrarRes.body.rodadaAtual).toBe(1);
        expect(encerrarRes.body.totalRodadas).toBe(1);

        const view = await req
            .get(`/torneio/${torneioId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(view.body.status).toBe("finalizado");
        expect(view.body.emCorte).toBe(false);

        const standings = await req
            .get(`/torneio/${torneioId}/standings`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(standings.body.standings).toHaveLength(N);
        expect(standings.body.standings[0].usuario.nome).toMatch(/^endnick\d+$/);

        await req
            .post(`/torneio/${torneioId}/encerrar`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(400);

        await req
            .put(`/torneio/${torneioId}/total-rodadas`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ totalRodadas: 2 })
            .expect(400);
    });

    afterAll(async () => {
        if (torneioId) {
            await mongoose.model("Partida").deleteMany({ torneioId });
            await mongoose.model("Inscricao").deleteMany({ torneioId });
            await mongoose.model("Torneio").deleteMany({ id: torneioId });
        }
        await mongoose.model("Deck").deleteMany({
            usuarioId: { $in: [adminId, ...playerIds].filter(Boolean) },
        });
        await mongoose.model("Usuario").deleteMany({
            email: new RegExp(`^${PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
        });
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }, 60_000);
});

/**
 * E2E focado: contestação com observação + rodadas além do limite Swiss.
 * 4 jogadores → Swiss natural = 2; maxRodadas=3 força a 3ª; PUT sobe para 4 e joga até o fim.
 */
describe("E2E – Contestação com observação e rodadas acima do Swiss", () => {
    jest.setTimeout(180_000);

    const PREFIX = `e2e_extra_${Date.now()}_`;
    const SENHA = "Senha@12345";
    const N = 4;
    const SWISS_NATURAL = Math.ceil(Math.log2(N)); // 2
    const MAX_RODADAS_INICIAL = 3;
    const TOTAL_FORCADO_DURANTE = 4;

    let req: ReturnType<typeof supertest>;
    let adminToken: string;
    let adminId: string;
    let torneioId: string;
    let playerIds: string[] = [];
    let playerTokens: string[] = [];

    const checkinTodos = async () => {
        await lote(Array.from({ length: N }, (_, i) => i), 4, async (i) => {
            await req
                .post(`/torneio/${torneioId}/checkin`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send()
                .expect(200);
        });
    };

    const finalizarRodada = async (partidas: PartidaInfo[]) => {
        for (const p of partidas.filter((x) => x.jogador2Id !== null && x.status !== "finalizada")) {
            await req
                .post(`/torneio/partida/${p.id}/resultado`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
                .expect(200);
        }
    };

    beforeAll(async () => {
        req = supertest(app());

        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI as string);
        }

        const orgRes = await req
            .post("/usuario/cadastrar")
            .send({ nome: "Org Extra", email: `${PREFIX}org@extra.com`, senha: SENHA })
            .expect(201);
        adminId = orgRes.body.id;
        await mongoose.model("Usuario").updateOne({ id: adminId }, { $set: { role: "admin" } });

        const adminLogin = await req
            .post("/usuario/login")
            .send({ email: `${PREFIX}org@extra.com`, senha: SENHA })
            .expect(200);
        adminToken = adminLogin.body.token;

        const indices = Array.from({ length: N }, (_, i) => i);
        playerIds = await lote(indices, 4, async (i) => {
            const res = await req
                .post("/usuario/cadastrar")
                .send({
                    nome: `Extra Player ${i}`,
                    email: `${PREFIX}p${i}@extra.com`,
                    senha: SENHA,
                })
                .expect(201);
            return res.body.id as string;
        });

        playerTokens = await lote(indices, 4, async (i) => {
            const res = await req
                .post("/usuario/login")
                .send({ email: `${PREFIX}p${i}@extra.com`, senha: SENHA })
                .expect(200);
            return res.body.token as string;
        });

        await lote(indices, 4, async (i) => {
            await req
                .put("/usuario/atualizar")
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send({ nickMTGO: `extranick${i}` })
                .expect(200);
        });

        const torneioRes = await req
            .post("/torneio/criar")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nome: `${PREFIX}Rodadas extras`,
                horario: new Date(Date.now() + 3_600_000).toISOString(),
                formato: "Standard",
                maxJogadores: 8,
                maxRodadas: MAX_RODADAS_INICIAL,
                exibirNomeJogador: "nickMOL",
            })
            .expect(201);
        torneioId = torneioRes.body.id;
        expect(torneioRes.body.maxRodadas).toBe(MAX_RODADAS_INICIAL);

        await lote(indices, 4, async (i) => {
            await req
                .post(`/torneio/${torneioId}/inscrever`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send()
                .expect(201);

            const deckRes = await req
                .post("/deck/cadastrar")
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send({
                    nome: `${PREFIX}Deck ${i}`,
                    formato: "Standard",
                    maindeck: MAINDECK_VALIDO,
                    sideboard: [],
                })
                .expect(201);

            await req
                .post(`/torneio/${torneioId}/deck`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send({ deckId: deckRes.body.id })
                .expect(200);

            await req
                .post(`/torneio/${torneioId}/checkin`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send()
                .expect(200);
        });
    }, 90_000);

    it("deve iniciar com maxRodadas acima do Swiss e contestar com observação persistida", async () => {
        expect(MAX_RODADAS_INICIAL).toBeGreaterThan(SWISS_NATURAL);

        const startRes = await req
            .post(`/torneio/${torneioId}/iniciar`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        expect(startRes.body.rodadaAtual).toBe(1);
        expect(startRes.body.totalRodadas).toBe(MAX_RODADAS_INICIAL);
        expect(startRes.body.totalRodadas).toBeGreaterThan(SWISS_NATURAL);

        const partidasR1 = (startRes.body.partidas as PartidaInfo[]).filter((p) => p.jogador2Id !== null);
        expect(partidasR1.length).toBe(2);

        const alvo = partidasR1[0];
        const outras = partidasR1.slice(1);

        await req
            .post(`/torneio/partida/${alvo.id}/resultado`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
            .expect(200);

        const observacao = "Placar invertido — j2 venceu 2-0 na mesa";
        const contestRes = await req
            .post(`/torneio/partida/${alvo.id}/contestar`)
            .set("Authorization", `Bearer ${playerTokens[playerIds.indexOf(alvo.jogador2Id!)]}`)
            .send({ observacao })
            .expect(200);

        expect(contestRes.body.contestado).toBe(true);
        expect(contestRes.body.observacaoContestacao).toBe(observacao);

        const listContestada = await req
            .get(`/torneio/${torneioId}/partidas?rodada=1`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        const partidaListada = listContestada.body.partidas.find((p: PartidaInfo) => p.id === alvo.id);
        expect(partidaListada.contestado).toBe(true);
        expect(partidaListada.observacaoContestacao).toBe(observacao);

        const ajusteRes = await req
            .put(`/torneio/partida/${alvo.id}/ajustar`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ vitoriasJogador1: 0, vitoriasJogador2: 2 })
            .expect(200);
        expect(ajusteRes.body.contestado).toBe(false);
        expect(ajusteRes.body.observacaoContestacao == null || ajusteRes.body.observacaoContestacao === "").toBe(true);

        await finalizarRodada(outras);
    });

    it("deve jogar rodadas extras além do Swiss e aumentar o total durante o torneio", async () => {
        await checkinTodos();
        const r2 = await req
            .post(`/torneio/${torneioId}/proxima-rodada`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(r2.body.finalizado).toBe(false);
        expect(r2.body.rodadaAtual).toBe(2);
        expect(r2.body.totalRodadas).toBe(MAX_RODADAS_INICIAL);
        expect(r2.body.emCorte).toBe(false);

        await finalizarRodada(r2.body.partidas as PartidaInfo[]);

        const aumentar = await req
            .put(`/torneio/${torneioId}/total-rodadas`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ totalRodadas: TOTAL_FORCADO_DURANTE })
            .expect(200);
        expect(aumentar.body.totalRodadasAnterior).toBe(MAX_RODADAS_INICIAL);
        expect(aumentar.body.totalRodadas).toBe(TOTAL_FORCADO_DURANTE);

        await checkinTodos();
        const r3 = await req
            .post(`/torneio/${torneioId}/proxima-rodada`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(r3.body.finalizado).toBe(false);
        expect(r3.body.rodadaAtual).toBe(3);
        expect(r3.body.totalRodadas).toBe(TOTAL_FORCADO_DURANTE);

        await finalizarRodada(r3.body.partidas as PartidaInfo[]);

        await checkinTodos();
        const r4 = await req
            .post(`/torneio/${torneioId}/proxima-rodada`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(r4.body.finalizado).toBe(false);
        expect(r4.body.rodadaAtual).toBe(4);

        await finalizarRodada(r4.body.partidas as PartidaInfo[]);

        const fim = await req
            .post(`/torneio/${torneioId}/proxima-rodada`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(fim.body.finalizado).toBe(true);
        expect(fim.body.classificacao).toHaveLength(N);

        const view = await req
            .get(`/torneio/${torneioId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        expect(view.body.status).toBe("finalizado");
        expect(view.body.totalRodadas).toBe(TOTAL_FORCADO_DURANTE);
        expect(view.body.emCorte).toBe(false);
    });

    it("deve rejeitar observação de contestação acima de 500 caracteres", async () => {
        const tRes = await req
            .post("/torneio/criar")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nome: `${PREFIX}Obs longa`,
                horario: new Date(Date.now() + 3_600_000).toISOString(),
                formato: "Standard",
                maxJogadores: 8,
                maxRodadas: 1,
            })
            .expect(201);
        const tid = tRes.body.id as string;

        await lote(Array.from({ length: N }, (_, i) => i), 4, async (i) => {
            await req
                .post(`/torneio/${tid}/inscrever`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send()
                .expect(201);
            const deckRes = await req
                .post("/deck/cadastrar")
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send({
                    nome: `${PREFIX}DeckObs ${i}`,
                    formato: "Standard",
                    maindeck: MAINDECK_VALIDO,
                    sideboard: [],
                })
                .expect(201);
            await req
                .post(`/torneio/${tid}/deck`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send({ deckId: deckRes.body.id })
                .expect(200);
            await req
                .post(`/torneio/${tid}/checkin`)
                .set("Authorization", `Bearer ${playerTokens[i]}`)
                .send()
                .expect(200);
        });

        const start = await req
            .post(`/torneio/${tid}/iniciar`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);
        const partida = (start.body.partidas as PartidaInfo[]).find((p) => p.jogador2Id)!;

        await req
            .post(`/torneio/partida/${partida.id}/resultado`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ vitoriasJogador1: 2, vitoriasJogador2: 0 })
            .expect(200);

        const longa = "x".repeat(501);
        const res = await req
            .post(`/torneio/partida/${partida.id}/contestar`)
            .set("Authorization", `Bearer ${playerTokens[playerIds.indexOf(partida.jogador2Id!)]}`)
            .send({ observacao: longa })
            .expect(400);
        expect(res.body.mensagem || JSON.stringify(res.body)).toMatch(/500|Observação|observacao/i);

        await mongoose.model("Partida").deleteMany({ torneioId: tid });
        await mongoose.model("Inscricao").deleteMany({ torneioId: tid });
        await mongoose.model("Torneio").deleteMany({ id: tid });
    });

    afterAll(async () => {
        if (torneioId) {
            await mongoose.model("Partida").deleteMany({ torneioId });
            await mongoose.model("Inscricao").deleteMany({ torneioId });
            await mongoose.model("Torneio").deleteMany({ id: torneioId });
        }
        await mongoose.model("Deck").deleteMany({
            usuarioId: { $in: [adminId, ...playerIds].filter(Boolean) },
        });
        await mongoose.model("Usuario").deleteMany({
            email: new RegExp(`^${PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
        });
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }, 60_000);
});
