import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Deck } from "../../../src/dominio/entidade/deck";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { agregarMetagame, slugificarArquetipo } from "../../../src/casosDeUso/metagame/agregarMetagame";

const agora = new Date("2026-08-14T12:00:00.000Z");

function torneio(overrides: Partial<ConstructorParameters<typeof Torneio>[0]> = {}) {
    return new Torneio({
        id: "torneio-1",
        nome: "Pauper Semanal",
        horario: new Date("2026-08-01T15:00:00.000Z"),
        formato: "pauper",
        donoId: "admin",
        status: "finalizado",
        rodadaAtual: 3,
        totalRodadas: 3,
        ...overrides,
    });
}

function deck(overrides: Partial<ConstructorParameters<typeof Deck>[0]> = {}) {
    return new Deck({
        id: "deck-1",
        nome: "Meu Terror",
        nomeConsolidado: "Blue Terror",
        formato: "pauper",
        maindeck: [
            { nome: "tolarian terror", quantidade: 4 },
            { nome: "island", quantidade: 18 },
            { nome: "brainstorm", quantidade: 4 },
        ],
        sideboard: [{ nome: "hydroblast", quantidade: 3 }],
        usuarioId: "user-1",
        ...overrides,
    });
}

function usuario(id: string, nome: string, nickMTGO = `${nome.toLowerCase()}_mtgo`) {
    return new Usuario({ id, nome, email: `${id}@a.com`, senha: "hash", role: "user", nickMTGO });
}

function inscricao(torneioId: string, usuarioId: string, deckId: string) {
    return new Inscricao({ id: `${torneioId}-${usuarioId}`, torneioId, usuarioId, deckId });
}

function partidaFinal(
    id: string,
    torneioId: string,
    j1: string,
    j2: string | null,
    v1: number,
    v2: number,
    extras: Partial<ConstructorParameters<typeof Partida>[0]> = {}
) {
    return new Partida({
        id,
        torneioId,
        rodada: 1,
        jogador1Id: j1,
        jogador2Id: j2,
        vitoriasJogador1: v1,
        vitoriasJogador2: v2,
        status: "finalizada",
        ...extras,
    });
}

describe("agregarMetagame", () => {
    const alice = usuario("user-1", "Alice");
    const bob = usuario("user-2", "Bob");
    const terror = deck({ id: "deck-terror", usuarioId: "user-1" });
    const affinity = deck({
        id: "deck-aff",
        usuarioId: "user-2",
        nome: "Meu Affinity",
        nomeConsolidado: "Affinity",
        maindeck: [
            { nome: "frogmite", quantidade: 4 },
            { nome: "mountain", quantidade: 4 },
        ],
        sideboard: [],
    });

    it("retorna lista vazia quando não há torneios", () => {
        const resultado = agregarMetagame({
            formato: "pauper",
            dias: 30,
            agora,
            torneios: [],
            inscricoes: [],
            partidas: [],
            decks: [],
            usuarios: [],
        });

        expect(resultado.formato).toBe("pauper");
        expect(resultado.dias).toBe(30);
        expect(resultado.totalDecks).toBe(0);
        expect(resultado.totalTorneios).toBe(0);
        expect(resultado.arquetipos).toEqual([]);
        expect(resultado.recentes).toEqual([]);
    });

    it("agrupa por nomeConsolidado e calcula metaPct e winrate", () => {
        const t = torneio();
        const resultado = agregarMetagame({
            formato: "pauper",
            dias: 30,
            agora,
            torneios: [t],
            inscricoes: [
                inscricao("torneio-1", "user-1", "deck-terror"),
                inscricao("torneio-1", "user-2", "deck-aff"),
            ],
            partidas: [
                partidaFinal("p1", "torneio-1", "user-1", "user-2", 2, 0, {
                    deckJogador1Id: "deck-terror",
                    deckJogador2Id: "deck-aff",
                }),
            ],
            decks: [terror, affinity],
            usuarios: [alice, bob],
        });

        expect(resultado.totalDecks).toBe(2);
        expect(resultado.totalTorneios).toBe(1);
        expect(resultado.arquetipos[0].nome).toBe("Blue Terror");
        expect(resultado.arquetipos[0].slug).toBe("blue-terror");
        expect(resultado.arquetipos[0].copias).toBe(1);
        expect(resultado.arquetipos[0].metaPct).toBe(50);
        expect(resultado.arquetipos[0].vitorias).toBe(1);
        expect(resultado.arquetipos[0].derrotas).toBe(0);
        expect(resultado.arquetipos[0].winrate).toBe(100);
        expect(resultado.arquetipos[0].cartaRepresentativa).toBe("brainstorm");
        expect(resultado.arquetipos[0].cartasChave).toEqual(["brainstorm", "tolarian terror"]);
        expect(resultado.arquetipos[0].cartasCores).toEqual(["island", "brainstorm", "tolarian terror"]);
        expect(resultado.arquetipos[1].cartasCores).toEqual(["frogmite", "mountain"]);
        expect(resultado.recentes).toHaveLength(1);
        expect(resultado.recentes[0].torneioNome).toBe("Pauper Semanal");
        expect(resultado.recentes[0].decks.map((d) => d.nome)).toEqual(["Blue Terror", "Affinity"]);
        expect(resultado.recentes[0].decks.map((d) => d.usuario.nome)).toEqual(["alice_mtgo", "bob_mtgo"]);
        expect(resultado.arquetipos[1].nome).toBe("Affinity");
        expect(resultado.arquetipos[1].winrate).toBe(0);
    });

    it("ignora bye no winrate", () => {
        const t = torneio();
        const resultado = agregarMetagame({
            formato: "pauper",
            dias: 30,
            agora,
            torneios: [t],
            inscricoes: [inscricao("torneio-1", "user-1", "deck-terror")],
            partidas: [partidaFinal("p-bye", "torneio-1", "user-1", null, 2, 0)],
            decks: [terror],
            usuarios: [alice],
        });

        expect(resultado.arquetipos[0].vitorias).toBe(0);
        expect(resultado.arquetipos[0].derrotas).toBe(0);
        expect(resultado.arquetipos[0].winrate).toBe(0);
        expect(resultado.arquetipos[0].copias).toBe(1);
    });

    it("usa o nome do deck quando nao ha nomeConsolidado, sem agrupar em Outros", () => {
        const t = torneio();
        const listaA = deck({
            id: "deck-x",
            nomeConsolidado: null,
            nome: "lista random",
            maindeck: [{ nome: "lightning bolt", quantidade: 4 }],
        });
        const listaB = deck({
            id: "deck-y",
            usuarioId: "user-2",
            nomeConsolidado: null,
            nome: "gruul do joao",
            maindeck: [{ nome: "lightning bolt", quantidade: 4 }],
        });
        const resultado = agregarMetagame({
            formato: "pauper",
            dias: 30,
            agora,
            torneios: [t],
            inscricoes: [
                inscricao("torneio-1", "user-1", "deck-x"),
                inscricao("torneio-1", "user-2", "deck-y"),
            ],
            partidas: [],
            decks: [listaA, listaB],
            usuarios: [alice, bob],
        });

        expect(resultado.arquetipos.map((a) => a.nome).sort()).toEqual(["gruul do joao", "lista random"]);
        expect(resultado.arquetipos.find((a) => a.nome === "Outros")).toBeUndefined();
        expect(resultado.arquetipos.find((a) => a.slug === "lista-random")?.copias).toBe(1);
    });

    it("ignora torneio secreto, outro formato e fora da janela", () => {
        const resultado = agregarMetagame({
            formato: "pauper",
            dias: 30,
            agora,
            torneios: [
                torneio({ id: "secreto", secreto: true }),
                torneio({ id: "modern", formato: "modern" }),
                torneio({ id: "antigo", horario: new Date("2026-01-01T00:00:00.000Z") }),
            ],
            inscricoes: [
                inscricao("secreto", "user-1", "deck-terror"),
                inscricao("modern", "user-1", "deck-terror"),
                inscricao("antigo", "user-1", "deck-terror"),
            ],
            partidas: [],
            decks: [terror],
            usuarios: [alice],
        });

        expect(resultado.totalTorneios).toBe(0);
        expect(resultado.arquetipos).toEqual([]);
    });

    it("calcula matchup e lista típica no detalhe", () => {
        const t = torneio();
        const terror2 = deck({
            id: "deck-terror-2",
            usuarioId: "user-3",
            maindeck: [
                { nome: "tolarian terror", quantidade: 4 },
                { nome: "brainstorm", quantidade: 4 },
                { nome: "counterspell", quantidade: 4 },
                { nome: "island", quantidade: 16 },
            ],
            sideboard: [{ nome: "hydroblast", quantidade: 2 }],
        });
        const carol = usuario("user-3", "Carol");

        const agregado = agregarMetagame({
            formato: "pauper",
            dias: 30,
            agora,
            torneios: [t],
            inscricoes: [
                inscricao("torneio-1", "user-1", "deck-terror"),
                inscricao("torneio-1", "user-2", "deck-aff"),
                inscricao("torneio-1", "user-3", "deck-terror-2"),
            ],
            partidas: [
                partidaFinal("p1", "torneio-1", "user-1", "user-2", 2, 1, {
                    deckJogador1Id: "deck-terror",
                    deckJogador2Id: "deck-aff",
                }),
                partidaFinal("p2", "torneio-1", "user-3", "user-2", 0, 2, {
                    deckJogador1Id: "deck-terror-2",
                    deckJogador2Id: "deck-aff",
                    rodada: 2,
                }),
            ],
            decks: [terror, affinity, terror2],
            usuarios: [alice, bob, carol],
        });

        const detalhe = agregado.porSlug.get("blue-terror");
        expect(detalhe).toBeDefined();
        expect(detalhe!.listaTipica.maindeck.some((c) => c.nome === "tolarian terror" && c.quantidade === 4)).toBe(true);
        expect(detalhe!.cartaRepresentativa).toBe("brainstorm");
        expect(detalhe!.matchups).toHaveLength(1);
        expect(detalhe!.matchups[0].slug).toBe("affinity");
        expect(detalhe!.matchups[0].vitorias).toBe(1);
        expect(detalhe!.matchups[0].derrotas).toBe(1);
        expect(detalhe!.matchups[0].partidas).toBe(2);
        expect(detalhe!.listas).toHaveLength(2);
        expect(detalhe!.listas.every((l) => l.nomeConsolidado === "Blue Terror")).toBe(true);
        expect(detalhe!.resultados).toHaveLength(2);
        expect(detalhe!.resultados.every((r) => r.colocacao >= 1)).toBe(true);
    });

    it("empate entra no denominador do winrate", () => {
        const t = torneio();
        const resultado = agregarMetagame({
            formato: "pauper",
            dias: 30,
            agora,
            torneios: [t],
            inscricoes: [
                inscricao("torneio-1", "user-1", "deck-terror"),
                inscricao("torneio-1", "user-2", "deck-aff"),
            ],
            partidas: [
                partidaFinal("p1", "torneio-1", "user-1", "user-2", 1, 1, {
                    deckJogador1Id: "deck-terror",
                    deckJogador2Id: "deck-aff",
                }),
            ],
            decks: [terror, affinity],
            usuarios: [alice, bob],
        });

        expect(resultado.arquetipos.find((a) => a.slug === "blue-terror")?.empates).toBe(1);
        expect(resultado.arquetipos.find((a) => a.slug === "blue-terror")?.winrate).toBe(0);
    });

    it("slugifica acentos e cai em outros quando o nome é vazio", () => {
        expect(slugificarArquetipo("Blue Terror")).toBe("blue-terror");
        expect(slugificarArquetipo("Café Aggro")).toBe("cafe-aggro");
        expect(slugificarArquetipo("   ")).toBe("outros");
    });

    it("desambigua slugs iguais e agrupa deck sem nome em Outros", () => {
        const t = torneio();
        const cafe = deck({
            id: "deck-cafe",
            nome: "Café Aggro",
            nomeConsolidado: "Café Aggro",
            maindeck: [{ nome: "lightning bolt", quantidade: 4 }],
        });
        const cafeAscii = deck({
            id: "deck-cafe-2",
            usuarioId: "user-2",
            nome: "Cafe Aggro",
            nomeConsolidado: "Cafe Aggro",
            maindeck: [{ nome: "lightning bolt", quantidade: 4 }],
        });
        const semNome = deck({
            id: "deck-vazio",
            usuarioId: "user-3",
            nome: "   ",
            nomeConsolidado: "  ",
            maindeck: [{ nome: "mountain", quantidade: 20 }],
        });
        const carol = usuario("user-3", "Carol");
        const resultado = agregarMetagame({
            formato: "pauper",
            dias: 30,
            agora,
            torneios: [t],
            inscricoes: [
                inscricao("torneio-1", "user-1", "deck-cafe"),
                inscricao("torneio-1", "user-2", "deck-cafe-2"),
                inscricao("torneio-1", "user-3", "deck-vazio"),
            ],
            partidas: [],
            decks: [cafe, cafeAscii, semNome],
            usuarios: [alice, bob, carol],
        });

        expect(resultado.arquetipos.map((a) => a.slug).sort()).toEqual(["cafe-aggro", "cafe-aggro-2", "outros"]);
        expect(resultado.arquetipos.find((a) => a.nome === "Outros")?.copias).toBe(1);
    });

    it("usa commander como carta representativa e cartasCores", () => {
        const t = torneio({ formato: "commander" });
        const edric = deck({
            id: "deck-edric",
            formato: "commander",
            nome: "Edric",
            nomeConsolidado: "Edric Tempo",
            commander: [{ nome: "edric, spymaster of trest", quantidade: 1 }],
            maindeck: [
                { nome: "sol ring", quantidade: 1 },
                { nome: "forest", quantidade: 30 },
            ],
            sideboard: [],
        });
        const resultado = agregarMetagame({
            formato: "commander",
            dias: 30,
            agora,
            torneios: [t],
            inscricoes: [inscricao("torneio-1", "user-1", "deck-edric")],
            partidas: [],
            decks: [edric],
            usuarios: [alice],
        });

        expect(resultado.arquetipos[0].cartaRepresentativa).toBe("edric, spymaster of trest");
        expect(resultado.arquetipos[0].cartasChave).toEqual(["edric, spymaster of trest"]);
        expect(resultado.arquetipos[0].cartasCores).toEqual(["edric, spymaster of trest"]);
    });

    it("ignora partida não finalizada e usa mediana par na lista típica", () => {
        const t = torneio();
        const terrorB = deck({
            id: "deck-terror-b",
            usuarioId: "user-2",
            maindeck: [
                { nome: "tolarian terror", quantidade: 2 },
                { nome: "island", quantidade: 18 },
                { nome: "brainstorm", quantidade: 4 },
            ],
            sideboard: [],
        });
        const resultado = agregarMetagame({
            formato: "pauper",
            dias: 30,
            agora,
            torneios: [t],
            inscricoes: [
                inscricao("torneio-1", "user-1", "deck-terror"),
                inscricao("torneio-1", "user-2", "deck-terror-b"),
            ],
            partidas: [
                partidaFinal("p-aberta", "torneio-1", "user-1", "user-2", 2, 0, {
                    status: "pendente",
                    deckJogador1Id: "deck-terror",
                    deckJogador2Id: "deck-terror-b",
                }),
            ],
            decks: [terror, terrorB],
            usuarios: [alice, bob],
        });

        expect(resultado.arquetipos[0].vitorias).toBe(0);
        expect(resultado.arquetipos[0].copias).toBe(2);
        const tipica = resultado.porSlug.get("blue-terror")!.listaTipica.maindeck;
        expect(tipica.find((c) => c.nome === "tolarian terror")?.quantidade).toBe(3);
    });

    it("limita recentes aos dois torneios mais novos", () => {
        const t1 = torneio({ id: "t-antigo", horario: new Date("2026-08-01T15:00:00.000Z") });
        const t2 = torneio({ id: "t-meio", nome: "Meio", horario: new Date("2026-08-08T15:00:00.000Z") });
        const t3 = torneio({ id: "t-novo", nome: "Novo", horario: new Date("2026-08-12T15:00:00.000Z") });
        const d2 = deck({ id: "deck-2", usuarioId: "user-2" });
        const d3 = deck({ id: "deck-3", usuarioId: "user-2" });
        const resultado = agregarMetagame({
            formato: "pauper",
            dias: 30,
            agora,
            torneios: [t1, t2, t3],
            inscricoes: [
                inscricao("t-antigo", "user-1", "deck-terror"),
                inscricao("t-meio", "user-2", "deck-2"),
                inscricao("t-novo", "user-2", "deck-3"),
            ],
            partidas: [],
            decks: [terror, d2, d3],
            usuarios: [alice, bob],
        });

        expect(resultado.totalTorneios).toBe(3);
        expect(resultado.recentes.map((r) => r.torneioId)).toEqual(["t-novo", "t-meio"]);
    });

    it("ignora partida sem deck, espelho do mesmo arquétipo e carta abaixo do limiar", () => {
        const t = torneio();
        const terrorB = deck({
            id: "deck-terror-b",
            usuarioId: "user-2",
            maindeck: [
                { nome: "tolarian terror", quantidade: 4 },
                { nome: "tolarian terror", quantidade: 4 },
                { nome: "island", quantidade: 18 },
                { nome: "", quantidade: 1 },
            ],
            sideboard: [],
        });
        const resultado = agregarMetagame({
            formato: "pauper",
            dias: 30,
            agora,
            torneios: [
                t,
                torneio({ id: "aberto", status: "em_andamento" }),
            ],
            inscricoes: [
                inscricao("torneio-1", "user-1", "deck-terror"),
                inscricao("torneio-1", "user-2", "deck-terror-b"),
                inscricao("torneio-1", "user-3", "deck-inexistente"),
            ],
            partidas: [
                partidaFinal("p-espelho", "torneio-1", "user-1", "user-2", 2, 0, {
                    deckJogador1Id: "deck-terror",
                    deckJogador2Id: "deck-terror-b",
                }),
                partidaFinal("p-sem-deck", "torneio-1", "user-1", "user-2", 2, 0, {
                    deckJogador1Id: "deck-sumiu",
                    deckJogador2Id: null,
                }),
            ],
            decks: [terror, terrorB],
            usuarios: [alice, bob],
        });

        expect(resultado.arquetipos).toHaveLength(1);
        expect(resultado.arquetipos[0].vitorias).toBe(1);
        expect(resultado.arquetipos[0].derrotas).toBe(1);
        expect(resultado.porSlug.get("blue-terror")!.matchups).toEqual([]);
        expect(resultado.porSlug.get("blue-terror")!.listaTipica.maindeck.find((c) => c.nome === "")).toBeUndefined();
    });

    it("commander500 ignora commander sem nome e omite carta rara da lista típica", () => {
        const t = torneio({ formato: "commander500" });
        const a = deck({
            id: "cmd-a",
            formato: "commander500",
            nome: "Edric A",
            nomeConsolidado: "Edric",
            commander: [{ nome: "", quantidade: 1 }, { nome: "edric, spymaster of trest", quantidade: 1 }],
            maindeck: [
                { nome: "sol ring", quantidade: 1 },
                { nome: "forest", quantidade: 30 },
            ],
        });
        const b = deck({
            id: "cmd-b",
            usuarioId: "user-2",
            formato: "commander500",
            nome: "Edric B",
            nomeConsolidado: "Edric",
            commander: [{ nome: "edric, spymaster of trest", quantidade: 1 }],
            maindeck: [
                { nome: "sol ring", quantidade: 1 },
                { nome: "forest", quantidade: 30 },
                { nome: "rhystic study", quantidade: 1 },
            ],
        });
        const c = deck({
            id: "cmd-c",
            usuarioId: "user-3",
            formato: "commander500",
            nome: "Edric C",
            nomeConsolidado: "Edric",
            commander: [{ nome: "edric, spymaster of trest", quantidade: 1 }],
            maindeck: [
                { nome: "sol ring", quantidade: 1 },
                { nome: "forest", quantidade: 30 },
            ],
        });
        const carol = usuario("user-3", "Carol");
        const resultado = agregarMetagame({
            formato: "commander500",
            dias: 30,
            agora,
            torneios: [t],
            inscricoes: [
                inscricao("torneio-1", "user-1", "cmd-a"),
                inscricao("torneio-1", "user-2", "cmd-b"),
                inscricao("torneio-1", "user-3", "cmd-c"),
            ],
            partidas: [
                partidaFinal("p-rev", "torneio-1", "user-2", "user-1", 2, 0, {
                    deckJogador1Id: "cmd-b",
                    deckJogador2Id: "cmd-a",
                }),
            ],
            decks: [a, b, c],
            usuarios: [alice, bob, carol],
        });

        expect(resultado.arquetipos[0].cartaRepresentativa).toBe("edric, spymaster of trest");
        expect(resultado.porSlug.get("edric")!.listaTipica.maindeck.map((x) => x.nome)).not.toContain("rhystic study");
    });
});
