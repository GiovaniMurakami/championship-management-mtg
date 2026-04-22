import {
    calcularEstatisticas,
    ordenarPorDesempate,
    mwp,
    gwp,
    omwp,
    ogwp,
    parKey,
    gerarPareamentos,
    MIN_PERCENTUAL,
    EstatisticasJogador,
} from "../../../src/casosDeUso/torneio/swiss";
import { Partida } from "../../../src/dominio/entidade/partida";

function criarPartida(overrides: Partial<Partida> & Pick<Partida, "jogador1Id" | "jogador2Id" | "vitoriasJogador1" | "vitoriasJogador2">): Partida {
    return new Partida({
        id: `p-${Math.random()}`,
        torneioId: "t-1",
        rodada: 1,
        status: "finalizada",
        criadoEm: new Date(),
        ...overrides,
    });
}

describe("Swiss - calcularEstatisticas", () => {
    it("deve retornar estatísticas zeradas quando não há partidas", () => {
        const stats = calcularEstatisticas(["j1", "j2"], []);
        const s1 = stats.get("j1")!;

        expect(s1.pontosMesa).toBe(0);
        expect(s1.vitoriasPartida).toBe(0);
        expect(s1.empatesPartida).toBe(0);
        expect(s1.derrotasPartida).toBe(0);
        expect(s1.totalPartidasJogadas).toBe(0);
        expect(s1.oponentesIds).toEqual([]);
    });

    it("deve calcular vitória corretamente (3 pontos mesa)", () => {
        const partidas = [
            criarPartida({ jogador1Id: "j1", jogador2Id: "j2", vitoriasJogador1: 2, vitoriasJogador2: 1 }),
        ];

        const stats = calcularEstatisticas(["j1", "j2"], partidas);

        expect(stats.get("j1")!.pontosMesa).toBe(3);
        expect(stats.get("j1")!.vitoriasPartida).toBe(1);
        expect(stats.get("j2")!.pontosMesa).toBe(0);
        expect(stats.get("j2")!.derrotasPartida).toBe(1);
    });

    it("deve calcular empate corretamente (1 ponto mesa cada)", () => {
        const partidas = [
            criarPartida({ jogador1Id: "j1", jogador2Id: "j2", vitoriasJogador1: 1, vitoriasJogador2: 1 }),
        ];

        const stats = calcularEstatisticas(["j1", "j2"], partidas);

        expect(stats.get("j1")!.pontosMesa).toBe(1);
        expect(stats.get("j1")!.empatesPartida).toBe(1);
        expect(stats.get("j2")!.pontosMesa).toBe(1);
        expect(stats.get("j2")!.empatesPartida).toBe(1);
    });

    it("deve calcular bye normal corretamente (3 pontos, 2-0)", () => {
        const partidas = [
            criarPartida({ jogador1Id: "j1", jogador2Id: null as unknown as string, vitoriasJogador1: 2, vitoriasJogador2: 0 }),
        ];

        const stats = calcularEstatisticas(["j1"], partidas);
        const s = stats.get("j1")!;

        expect(s.pontosMesa).toBe(3);
        expect(s.vitoriasPartida).toBe(1);
        expect(s.vitoriasJogo).toBe(2);
        expect(s.totalJogosJogados).toBe(2);
        expect(s.oponentesIds).toEqual([]);
    });

    it("deve calcular bye de penalidade corretamente (0 pontos, 0-2)", () => {
        const partidas = [
            criarPartida({ jogador1Id: "j1", jogador2Id: null as unknown as string, vitoriasJogador1: 0, vitoriasJogador2: 2 }),
        ];

        const stats = calcularEstatisticas(["j1"], partidas);
        const s = stats.get("j1")!;

        expect(s.pontosMesa).toBe(0);
        expect(s.derrotasPartida).toBe(1);
        expect(s.vitoriasPartida).toBe(0);
        expect(s.vitoriasJogo).toBe(0);
        expect(s.totalJogosJogados).toBe(2);
        expect(s.totalPartidasJogadas).toBe(1);
        expect(s.oponentesIds).toEqual([]);
    });

    it("deve rastrear oponentes corretamente", () => {
        const partidas = [
            criarPartida({ jogador1Id: "j1", jogador2Id: "j2", vitoriasJogador1: 2, vitoriasJogador2: 0 }),
            criarPartida({ jogador1Id: "j1", jogador2Id: "j3", vitoriasJogador1: 2, vitoriasJogador2: 1 }),
        ];

        const stats = calcularEstatisticas(["j1", "j2", "j3"], partidas);
        expect(stats.get("j1")!.oponentesIds).toEqual(["j2", "j3"]);
        expect(stats.get("j2")!.oponentesIds).toEqual(["j1"]);
    });

    it("deve ignorar partidas pendentes", () => {
        const partidas = [
            criarPartida({ jogador1Id: "j1", jogador2Id: "j2", vitoriasJogador1: 0, vitoriasJogador2: 0, status: "pendente" } as any),
        ];

        const stats = calcularEstatisticas(["j1", "j2"], partidas);
        expect(stats.get("j1")!.totalPartidasJogadas).toBe(0);
    });

    it("deve acumular estatísticas de múltiplas rodadas corretamente", () => {
        const partidas = [
            criarPartida({ jogador1Id: "j1", jogador2Id: "j2", vitoriasJogador1: 2, vitoriasJogador2: 0, rodada: 1 }),
            criarPartida({ jogador1Id: "j1", jogador2Id: "j3", vitoriasJogador1: 2, vitoriasJogador2: 1, rodada: 2 }),
            criarPartida({ jogador1Id: "j2", jogador2Id: "j3", vitoriasJogador1: 1, vitoriasJogador2: 1, rodada: 2 }),
        ];

        const stats = calcularEstatisticas(["j1", "j2", "j3"], partidas);
        const s1 = stats.get("j1")!;

        expect(s1.pontosMesa).toBe(6); // 3 + 3
        expect(s1.vitoriasPartida).toBe(2);
        expect(s1.empatesPartida).toBe(0);
        expect(s1.derrotasPartida).toBe(0);
        expect(s1.totalPartidasJogadas).toBe(2);
        expect(s1.vitoriasJogo).toBe(4); // 2 + 2
        expect(s1.totalJogosJogados).toBe(5); // (2+0) + (2+1)
        expect(s1.oponentesIds).toEqual(["j2", "j3"]);

        const s2 = stats.get("j2")!;
        expect(s2.pontosMesa).toBe(1); // 0 + 1
        expect(s2.vitoriasPartida).toBe(0);
        expect(s2.empatesPartida).toBe(1);
        expect(s2.derrotasPartida).toBe(1);

        const s3 = stats.get("j3")!;
        expect(s3.pontosMesa).toBe(1); // 0 + 1
    });

    it("deve criar stats zeradas para jogador presente em jogadoresIds mas sem partidas", () => {
        const partidas = [
            criarPartida({ jogador1Id: "j1", jogador2Id: "j2", vitoriasJogador1: 2, vitoriasJogador2: 0 }),
        ];

        const stats = calcularEstatisticas(["j1", "j2", "j3"], partidas);
        const s3 = stats.get("j3")!;

        expect(s3.pontosMesa).toBe(0);
        expect(s3.totalPartidasJogadas).toBe(0);
        expect(s3.oponentesIds).toEqual([]);
    });
});

describe("Swiss - critérios de desempate", () => {
    it("mwp deve retornar MIN_PERCENTUAL quando não há partidas", () => {
        const s: EstatisticasJogador = {
            usuarioId: "j1", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0,
            derrotasPartida: 0, totalPartidasJogadas: 0, vitoriasJogo: 0,
            totalJogosJogados: 0, oponentesIds: [],
        };
        expect(mwp(s)).toBe(MIN_PERCENTUAL);
    });

    it("mwp deve calcular corretamente", () => {
        const s: EstatisticasJogador = {
            usuarioId: "j1", pontosMesa: 6, vitoriasPartida: 2, empatesPartida: 0,
            derrotasPartida: 1, totalPartidasJogadas: 3, vitoriasJogo: 4,
            totalJogosJogados: 6, oponentesIds: [],
        };
        expect(mwp(s)).toBeCloseTo(2 / 3, 5);
    });

    it("mwp deve respeitar o mínimo de 0.33", () => {
        const s: EstatisticasJogador = {
            usuarioId: "j1", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0,
            derrotasPartida: 3, totalPartidasJogadas: 3, vitoriasJogo: 0,
            totalJogosJogados: 6, oponentesIds: [],
        };
        expect(mwp(s)).toBe(MIN_PERCENTUAL);
    });

    it("gwp deve retornar MIN_PERCENTUAL quando não há jogos", () => {
        const s: EstatisticasJogador = {
            usuarioId: "j1", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0,
            derrotasPartida: 0, totalPartidasJogadas: 0, vitoriasJogo: 0,
            totalJogosJogados: 0, oponentesIds: [],
        };
        expect(gwp(s)).toBe(MIN_PERCENTUAL);
    });

    it("gwp deve calcular corretamente", () => {
        const s: EstatisticasJogador = {
            usuarioId: "j1", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0,
            derrotasPartida: 0, totalPartidasJogadas: 0, vitoriasJogo: 4,
            totalJogosJogados: 6, oponentesIds: [],
        };
        expect(gwp(s)).toBeCloseTo(4 / 6, 5);
    });

    it("omwp deve usar MIN_PERCENTUAL sem oponentes", () => {
        const statsMap = new Map<string, EstatisticasJogador>();
        const s: EstatisticasJogador = {
            usuarioId: "j1", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0,
            derrotasPartida: 0, totalPartidasJogadas: 0, vitoriasJogo: 0,
            totalJogosJogados: 0, oponentesIds: [],
        };
        statsMap.set("j1", s);
        expect(omwp(s, statsMap)).toBe(MIN_PERCENTUAL);
    });

    it("omwp deve calcular a média de mwp dos oponentes", () => {
        const statsMap = new Map<string, EstatisticasJogador>();
        const j1: EstatisticasJogador = {
            usuarioId: "j1", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0,
            derrotasPartida: 0, totalPartidasJogadas: 1, vitoriasJogo: 2,
            totalJogosJogados: 3, oponentesIds: ["j2"],
        };
        const j2: EstatisticasJogador = {
            usuarioId: "j2", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0,
            derrotasPartida: 1, totalPartidasJogadas: 1, vitoriasJogo: 1,
            totalJogosJogados: 3, oponentesIds: ["j1"],
        };
        statsMap.set("j1", j1);
        statsMap.set("j2", j2);

        expect(omwp(j1, statsMap)).toBe(mwp(j2));
    });
});

describe("Swiss - ordenarPorDesempate", () => {
    it("deve ordenar por pontos de mesa (maior primeiro)", () => {
        const statsMap = new Map<string, EstatisticasJogador>();
        const j1: EstatisticasJogador = {
            usuarioId: "j1", pontosMesa: 6, vitoriasPartida: 2, empatesPartida: 0,
            derrotasPartida: 0, totalPartidasJogadas: 2, vitoriasJogo: 4,
            totalJogosJogados: 4, oponentesIds: [],
        };
        const j2: EstatisticasJogador = {
            usuarioId: "j2", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0,
            derrotasPartida: 1, totalPartidasJogadas: 2, vitoriasJogo: 2,
            totalJogosJogados: 4, oponentesIds: [],
        };
        statsMap.set("j1", j1);
        statsMap.set("j2", j2);

        const resultado = ordenarPorDesempate([j1, j2], statsMap);
        expect(resultado[0].usuarioId).toBe("j1");
        expect(resultado[1].usuarioId).toBe("j2");
    });

    it("deve desempatar por omwp quando pontos de mesa são iguais", () => {
        const statsMap = new Map<string, EstatisticasJogador>();
        // j1 e j2 possuem 3 pontos cada, mas j1 enfrentou oponentes mais fortes
        const forte: EstatisticasJogador = {
            usuarioId: "forte", pontosMesa: 6, vitoriasPartida: 2, empatesPartida: 0,
            derrotasPartida: 0, totalPartidasJogadas: 2, vitoriasJogo: 4,
            totalJogosJogados: 4, oponentesIds: [],
        };
        const fraco: EstatisticasJogador = {
            usuarioId: "fraco", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0,
            derrotasPartida: 2, totalPartidasJogadas: 2, vitoriasJogo: 0,
            totalJogosJogados: 4, oponentesIds: [],
        };
        const j1: EstatisticasJogador = {
            usuarioId: "j1", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0,
            derrotasPartida: 1, totalPartidasJogadas: 2, vitoriasJogo: 2,
            totalJogosJogados: 4, oponentesIds: ["forte", "fraco"],
        };
        const j2: EstatisticasJogador = {
            usuarioId: "j2", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0,
            derrotasPartida: 1, totalPartidasJogadas: 2, vitoriasJogo: 2,
            totalJogosJogados: 4, oponentesIds: ["fraco", "fraco"],
        };
        statsMap.set("j1", j1);
        statsMap.set("j2", j2);
        statsMap.set("forte", forte);
        statsMap.set("fraco", fraco);

        const resultado = ordenarPorDesempate([j2, j1], statsMap);
        // j1 tem omwp maior (enfrentou "forte"), logo fica em primeiro
        expect(resultado[0].usuarioId).toBe("j1");
        expect(resultado[1].usuarioId).toBe("j2");
    });

    it("deve usar desempate lexicográfico quando todos os critérios são idênticos", () => {
        const statsMap = new Map<string, EstatisticasJogador>();
        const jA: EstatisticasJogador = {
            usuarioId: "a-jogador", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0,
            derrotasPartida: 0, totalPartidasJogadas: 1, vitoriasJogo: 2,
            totalJogosJogados: 3, oponentesIds: [],
        };
        const jB: EstatisticasJogador = {
            usuarioId: "b-jogador", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0,
            derrotasPartida: 0, totalPartidasJogadas: 1, vitoriasJogo: 2,
            totalJogosJogados: 3, oponentesIds: [],
        };
        statsMap.set("a-jogador", jA);
        statsMap.set("b-jogador", jB);

        // Diferentes ordens de input devem produzir mesmo resultado determinístico
        const r1 = ordenarPorDesempate([jA, jB], statsMap);
        const r2 = ordenarPorDesempate([jB, jA], statsMap);
        expect(r1[0].usuarioId).toBe("a-jogador");
        expect(r2[0].usuarioId).toBe("a-jogador");
    });

    it("deve desempatar por gwp quando pontos e omwp são iguais", () => {
        const statsMap = new Map<string, EstatisticasJogador>();
        // Mesmos pontos e sem oponentes (omwp = MIN_PERCENTUAL para ambos),
        // mas gwp diferente (j1 ganhou mais jogos individuais)
        const j1: EstatisticasJogador = {
            usuarioId: "j1", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0,
            derrotasPartida: 0, totalPartidasJogadas: 1, vitoriasJogo: 2,
            totalJogosJogados: 2, oponentesIds: [],
        };
        const j2: EstatisticasJogador = {
            usuarioId: "j2", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0,
            derrotasPartida: 0, totalPartidasJogadas: 1, vitoriasJogo: 2,
            totalJogosJogados: 3, oponentesIds: [],
        };
        statsMap.set("j1", j1);
        statsMap.set("j2", j2);

        const resultado = ordenarPorDesempate([j2, j1], statsMap);
        // j1 gwp = 2/2 = 1.0, j2 gwp = 2/3 = 0.666
        expect(resultado[0].usuarioId).toBe("j1");
    });
});

describe("Swiss - parKey", () => {
    it("deve gerar a mesma chave independente da ordem", () => {
        expect(parKey("a", "b")).toBe(parKey("b", "a"));
    });

    it("deve gerar chaves diferentes para pares diferentes", () => {
        expect(parKey("a", "b")).not.toBe(parKey("a", "c"));
    });
});

describe("Swiss - gerarPareamentos", () => {
    it("deve parear jogadores e gerar bye quando ímpar", () => {
        const jogadores: EstatisticasJogador[] = [
            { usuarioId: "j1", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0, derrotasPartida: 0, totalPartidasJogadas: 1, vitoriasJogo: 2, totalJogosJogados: 2, oponentesIds: [] },
            { usuarioId: "j2", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0, derrotasPartida: 1, totalPartidasJogadas: 1, vitoriasJogo: 0, totalJogosJogados: 2, oponentesIds: [] },
            { usuarioId: "j3", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0, derrotasPartida: 1, totalPartidasJogadas: 1, vitoriasJogo: 0, totalJogosJogados: 2, oponentesIds: [] },
        ];

        const pares = gerarPareamentos(jogadores, new Set());

        expect(pares).toHaveLength(2);
        // Um dos pares deve ser bye
        const byes = pares.filter((p) => p.jogador2Id === null);
        expect(byes).toHaveLength(1);
    });

    it("deve parear todos em pares com número par de jogadores", () => {
        const jogadores: EstatisticasJogador[] = [
            { usuarioId: "j1", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0, derrotasPartida: 0, totalPartidasJogadas: 1, vitoriasJogo: 2, totalJogosJogados: 2, oponentesIds: [] },
            { usuarioId: "j2", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0, derrotasPartida: 0, totalPartidasJogadas: 1, vitoriasJogo: 2, totalJogosJogados: 2, oponentesIds: [] },
            { usuarioId: "j3", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0, derrotasPartida: 1, totalPartidasJogadas: 1, vitoriasJogo: 0, totalJogosJogados: 2, oponentesIds: [] },
            { usuarioId: "j4", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0, derrotasPartida: 1, totalPartidasJogadas: 1, vitoriasJogo: 0, totalJogosJogados: 2, oponentesIds: [] },
        ];

        const pares = gerarPareamentos(jogadores, new Set());
        expect(pares).toHaveLength(2);
        expect(pares.every((p) => p.jogador2Id !== null)).toBe(true);
    });

    it("deve tentar evitar rematches", () => {
        const jogadores: EstatisticasJogador[] = [
            { usuarioId: "j1", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0, derrotasPartida: 0, totalPartidasJogadas: 1, vitoriasJogo: 2, totalJogosJogados: 2, oponentesIds: ["j2"] },
            { usuarioId: "j2", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0, derrotasPartida: 0, totalPartidasJogadas: 1, vitoriasJogo: 2, totalJogosJogados: 2, oponentesIds: ["j1"] },
            { usuarioId: "j3", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0, derrotasPartida: 1, totalPartidasJogadas: 1, vitoriasJogo: 0, totalJogosJogados: 2, oponentesIds: ["j4"] },
            { usuarioId: "j4", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0, derrotasPartida: 1, totalPartidasJogadas: 1, vitoriasJogo: 0, totalJogosJogados: 2, oponentesIds: ["j3"] },
        ];

        const historico = new Set([parKey("j1", "j2"), parKey("j3", "j4")]);
        const pares = gerarPareamentos(jogadores, historico);

        // j1 não deve enfrentar j2 novamente
        const par1 = pares.find((p) => p.jogador1Id === "j1");
        expect(par1?.jogador2Id).not.toBe("j2");
    });

    it("deve tentar evitar BYE repetido para o mesmo jogador", () => {
        const jogadores: EstatisticasJogador[] = [
            { usuarioId: "j1", pontosMesa: 6, vitoriasPartida: 2, empatesPartida: 0, derrotasPartida: 0, totalPartidasJogadas: 2, vitoriasJogo: 4, totalJogosJogados: 4, oponentesIds: [] },
            { usuarioId: "j2", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0, derrotasPartida: 1, totalPartidasJogadas: 2, vitoriasJogo: 2, totalJogosJogados: 4, oponentesIds: [] },
            { usuarioId: "j3", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0, derrotasPartida: 2, totalPartidasJogadas: 2, vitoriasJogo: 0, totalJogosJogados: 4, oponentesIds: [] },
        ];

        // j3 já recebeu BYE antes
        const jaRecebeuBye = new Set(["j3"]);
        const pares = gerarPareamentos(jogadores, new Set(), jaRecebeuBye);

        // Deve haver exatamente um BYE
        const byes = pares.filter((p) => p.jogador2Id === null);
        expect(byes).toHaveLength(1);
        // Se possível, outro jogador deve receber o BYE em vez de j3
        expect(byes[0].jogador1Id).not.toBe("j3");
    });

    it("deve forçar rematch quando todos os pares possíveis já se enfrentaram", () => {
        // 2 jogadores que já se enfrentaram. Não há outra opção.
        const jogadores: EstatisticasJogador[] = [
            { usuarioId: "j1", pontosMesa: 3, vitoriasPartida: 1, empatesPartida: 0, derrotasPartida: 0, totalPartidasJogadas: 1, vitoriasJogo: 2, totalJogosJogados: 2, oponentesIds: ["j2"] },
            { usuarioId: "j2", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0, derrotasPartida: 1, totalPartidasJogadas: 1, vitoriasJogo: 0, totalJogosJogados: 2, oponentesIds: ["j1"] },
        ];

        const historico = new Set([parKey("j1", "j2")]);
        const pares = gerarPareamentos(jogadores, historico);

        // Quando não há alternativa, deve parear mesmo assim (fallback)
        expect(pares).toHaveLength(1);
        expect(pares[0].jogador1Id).toBe("j1");
        expect(pares[0].jogador2Id).toBe("j2");
    });

    it("deve gerar BYE para o único jogador restante", () => {
        const jogadores: EstatisticasJogador[] = [
            { usuarioId: "j1", pontosMesa: 0, vitoriasPartida: 0, empatesPartida: 0, derrotasPartida: 0, totalPartidasJogadas: 0, vitoriasJogo: 0, totalJogosJogados: 0, oponentesIds: [] },
        ];

        const pares = gerarPareamentos(jogadores, new Set());

        expect(pares).toHaveLength(1);
        expect(pares[0].jogador1Id).toBe("j1");
        expect(pares[0].jogador2Id).toBeNull();
    });

    it("deve lidar com lista vazia de jogadores", () => {
        const pares = gerarPareamentos([], new Set());
        expect(pares).toHaveLength(0);
    });

    it("deve produzir pareamentos corretos com 6 jogadores", () => {
        const jogadores: EstatisticasJogador[] = Array.from({ length: 6 }, (_, i) => ({
            usuarioId: `j${i + 1}`,
            pontosMesa: (5 - i) * 3,
            vitoriasPartida: 5 - i,
            empatesPartida: 0,
            derrotasPartida: i,
            totalPartidasJogadas: 5,
            vitoriasJogo: (5 - i) * 2,
            totalJogosJogados: 10,
            oponentesIds: [],
        }));

        const pares = gerarPareamentos(jogadores, new Set());

        expect(pares).toHaveLength(3);
        expect(pares.every((p) => p.jogador2Id !== null)).toBe(true);

        // Verifica que todos jogadores foram pareados exatamente uma vez
        const todosIds = pares.flatMap((p) => [p.jogador1Id, p.jogador2Id]);
        expect(new Set(todosIds).size).toBe(6);
    });
});
