/**
 * E2E: Torneio Swiss com 150 jogadores
 *
 * Fluxo completo com banco real (MongoDB Atlas) e endpoints HTTP reais via supertest.
 * Rate limiters são neutralizados para permitir o volume de requisições do teste.
 * Ably e EventEmitter de eventos são silenciados (sem efeitos colaterais externos).
 *
 * Execução: jest tests/e2e/fluxoTorneio150.e2e.test.ts --testTimeout=300000
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
        publicReadRateLimiter: passthrough,
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

import { app } from "../../src/app";

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

interface PartidaInfo {
    id: string;
    jogador1Id: string;
    jogador2Id: string | null;
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
    jest.setTimeout(300_000);

    const PREFIX = `e2e_${Date.now()}_`;
    const SENHA = "Senha@12345";
    const N_PLAYERS = 150;

    let req: ReturnType<typeof supertest>;

    // ── Estado compartilhado entre testes ─────────────────────────────────────
    let adminToken: string;
    let adminId: string;
    let torneioId: string;
    let playerIds: string[] = [];
    let playerTokens: string[] = [];
    let rodadaPartidas: PartidaInfo[] = [];
    /** IDs dos jogadores dropados na Fase 4 — usados para filtrar partidas já resolvidas. */
    let droppedIds: string[] = [];
    /** IDs de partidas da rodada 5 pré-registradas fora do lote normal — excluídas da Fase 5. */
    let excludedPartidaIds: string[] = [];

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
            })
            .expect(201);
        torneioId = torneioRes.body.id;

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
    }, 300_000);

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
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // Fase 2: Rodadas 1–4
    // ═══════════════════════════════════════════════════════════════════════════

    it("deve completar as rodadas 1 a 4", async () => {
        const allIndices = Array.from({ length: N_PLAYERS }, (_, i) => i);

        for (let r = 1; r <= 4; r++) {
            const partidas = rodadaPartidas.filter((p) => p.jogador2Id !== null);
            await Promise.all(
                partidas.map((p) =>
                    req
                        .post(`/torneio/partida/${p.id}/resultado`)
                        .set("Authorization", `Bearer ${adminToken}`)
                        .send(resultadoAleatorio())
                        .expect(200)
                )
            );

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

    // ═══════════════════════════════════════════════════════════════════════════
    // Fase 3: Standings intermediários (rodada 5 já criada → 4 rodadas contabilizadas)
    // ═══════════════════════════════════════════════════════════════════════════

    it("deve retornar standings com 150 jogadores após 4 rodadas consolidadas", async () => {
        const res = await req
            .get(`/torneio/${torneioId}/standings`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        const { standings } = res.body;
        expect(standings).toHaveLength(N_PLAYERS);

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
        }

        // `rodadaIniciadaEm` no formato ISO com offset -03:00 (Brasília)
        expect(res.body.rodadaIniciadaEm).toMatch(/-03:00$/);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // Fase 4: Drop dos 10 últimos colocados
    // ═══════════════════════════════════════════════════════════════════════════

    it("deve dropar os 10 últimos colocados antes da rodada 5", async () => {
        const standingsRes = await req
            .get(`/torneio/${torneioId}/standings`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        const standings: Array<{ usuario: { id: string; nome: string }; posicao: number }> =
            standingsRes.body.standings;

        const ultimos = standings.slice(-10);
        droppedIds = ultimos.map((entry) => entry.usuario.id);

        const dropResults = await Promise.all(
            ultimos.map((entry) =>
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

        // Jogador 2 contesta
        const contestRes = await req
            .post(`/torneio/partida/${alvo.id}/contestar`)
            .set("Authorization", `Bearer ${playerTokens[idxJ2]}`)
            .expect(200);
        expect(contestRes.body.contestado).toBe(true);
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
    // Fase 5: Rodadas 5–8 e finalização
    // ═══════════════════════════════════════════════════════════════════════════

    it("deve completar rodadas 5-8 e finalizar o torneio", async () => {
        const droppedSet = new Set(droppedIds);

        // Índices dos jogadores ativos (não dropados)
        const activeIndices = Array.from({ length: N_PLAYERS }, (_, i) => i)
            .filter((i) => !droppedSet.has(playerIds[i]));
        expect(activeIndices).toHaveLength(N_PLAYERS - 10);

        for (let r = 5; r <= 8; r++) {
            // Excluir: byes, partidas de dropados (auto-resolvidas) e as pré-registradas manualmente
            const excludedSet = new Set(excludedPartidaIds);
            const partidas = rodadaPartidas.filter(
                (p) =>
                    p.jogador2Id !== null &&
                    !droppedSet.has(p.jogador1Id) &&
                    !droppedSet.has(p.jogador2Id) &&
                    !excludedSet.has(p.id)
            );

            await Promise.all(
                partidas.map((p) =>
                    req
                        .post(`/torneio/partida/${p.id}/resultado`)
                        .set("Authorization", `Bearer ${adminToken}`)
                        .send(resultadoAleatorio())
                        .expect(200)
                )
            );

            if (r < 8) {
                // Check-in dos jogadores ativos para a próxima rodada
                await lote(activeIndices, 15, async (i) => {
                    await req
                        .post(`/torneio/${torneioId}/checkin`)
                        .set("Authorization", `Bearer ${playerTokens[i]}`)
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
                // Rodada 6 em diante: apenas os 140 ativos
                if (r === 5) {
                    expect(avancRes.body.rodadaAtual).toBe(6);
                    // 140 jogadores pares → 70 partidas
                    expect(avancRes.body.partidas).toHaveLength(70);
                }
                // Nenhum dropado deve aparecer nas novas partidas
                for (const p of rodadaPartidas) {
                    expect(droppedSet.has(p.jogador1Id)).toBe(false);
                    if (p.jogador2Id) expect(droppedSet.has(p.jogador2Id)).toBe(false);
                }
            } else {
                // Torneio finalizado após rodada 8
                expect(avancRes.body.finalizado).toBe(true);
                expect(Array.isArray(avancRes.body.classificacao)).toBe(true);
                expect(avancRes.body.classificacao.length).toBeGreaterThan(0);
                // Classificação ordenada por posição
                for (let i = 0; i < avancRes.body.classificacao.length - 1; i++) {
                    expect(avancRes.body.classificacao[i].posicao)
                        .toBeLessThanOrEqual(avancRes.body.classificacao[i + 1].posicao);
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

    it("deve retornar standings finais com todos os 150 jogadores ordenados", async () => {
        const res = await req
            .get(`/torneio/${torneioId}/standings`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        const { standings } = res.body;

        // Todos os 150 jogadores (incluindo droppados)
        expect(standings).toHaveLength(N_PLAYERS);

        // Posições não-decrescentes
        for (let i = 0; i < standings.length - 1; i++) {
            expect(standings[i].posicao).toBeLessThanOrEqual(standings[i + 1].posicao);
        }

        // Exatamente 10 droppados
        const droppados = standings.filter((e: { dropped?: boolean }) => e.dropped === true);
        expect(droppados.length).toBe(10);
        // Os IDs dos droppados batem com os que registramos
        const droppedIdsNoStandings = droppados.map((e: { usuario: { id: string } }) => e.usuario.id);
        for (const id of droppedIds) {
            expect(droppedIdsNoStandings).toContain(id);
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
        expect(res.body.rodadaAtual).toBe(8);
        expect(res.body.totalRodadas).toBe(8);
        expect(res.body.totalInscritos).toBe(N_PLAYERS);
        // Todas as partidas do torneio são retornadas no GET /torneio/:id
        // 5 rodadas×75 + 3 rodadas×70 = 585
        expect(res.body.partidas.length).toBe(585);
        // Nenhuma partida deve estar pendente ao final
        const pendentes = res.body.partidas.filter((p: { status: string }) => p.status === "pendente");
        expect(pendentes).toHaveLength(0);
    });

    it("GET /torneio/:id/partidas sem filtro deve retornar todas as 585 partidas do torneio", async () => {
        const res = await req
            .get(`/torneio/${torneioId}/partidas`)
            .set("Authorization", `Bearer ${adminToken}`)
            .expect(200);

        expect(res.body.torneioId).toBe(torneioId);
        // 75×5 + 70×3 = 585
        expect(res.body.partidas).toHaveLength(585);

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
        // Rodadas 1-5: 75 partidas cada
        for (const rodada of [1, 2, 3, 4, 5]) {
            const res = await req
                .get(`/torneio/${torneioId}/partidas?rodada=${rodada}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);
            expect(res.body.partidas).toHaveLength(75);
            for (const p of res.body.partidas) {
                expect(p.rodada).toBe(rodada);
            }
        }
        // Rodadas 6-8: 70 partidas cada
        for (const rodada of [6, 7, 8]) {
            const res = await req
                .get(`/torneio/${torneioId}/partidas?rodada=${rodada}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .expect(200);
            expect(res.body.partidas).toHaveLength(70);
            for (const p of res.body.partidas) {
                expect(p.rodada).toBe(rodada);
            }
        }
    });

    it("GET /torneio/:id/meu-historico deve retornar as 8 partidas do jogador com campos corretos", async () => {
        // Escolhe o primeiro jogador que não foi dropado (tem partidas em todas as 8 rodadas)
        const nonDroppedIdx = Array.from({ length: N_PLAYERS }, (_, i) => i)
            .find((i) => !droppedIds.includes(playerIds[i]))!;

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

        await mongoose.disconnect();
    }, 60_000);
});
