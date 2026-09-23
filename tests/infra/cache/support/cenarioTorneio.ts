import { criarRepositorios } from "../../../../src/composicao/repositorios";
import { criarCasosDeUso } from "../../../../src/composicao/casos";
import { criarServicos } from "../../../../src/composicao/servicos";
import { CacheDynamoDbServico } from "../../../../src/infra/services/cacheDynamoDbServico";
import { BuscarStandings } from "../../../../src/casosDeUso/torneio/buscarStandings";
import { ListarPartidasTorneio } from "../../../../src/casosDeUso/torneio/listarPartidasTorneio";
import { ListarTorneios } from "../../../../src/casosDeUso/torneio/listarTorneios";
import { BuscarSeoTorneio } from "../../../../src/casosDeUso/torneio/buscarSeoTorneio";
import { RankingLiga } from "../../../../src/casosDeUso/liga/rankingLiga";
import { ListarMetagame } from "../../../../src/casosDeUso/metagame/listarMetagame";
import { BuscarArquetipoMetagame } from "../../../../src/casosDeUso/metagame/buscarArquetipoMetagame";
import { Torneio, StatusTorneio } from "../../../../src/dominio/entidade/torneio";
import { Usuario } from "../../../../src/dominio/entidade/usuario";
import { Inscricao } from "../../../../src/dominio/entidade/inscricao";
import { Deck } from "../../../../src/dominio/entidade/deck";
import { Liga } from "../../../../src/dominio/entidade/liga";
import { Partida } from "../../../../src/dominio/entidade/partida";
import { DynamoMemoria } from "./dynamoMemoria";

export const T = "torneio-cache", L = "liga-cache";
export const admin = { torneioId: T, id: T, donoId: "admin", usuarioId: "admin", requisitanteId: "admin", isAdmin: true };
const json = (value: unknown) => JSON.parse(JSON.stringify(value));
export class CenarioTorneio {
  readonly repos = criarRepositorios();
  readonly casos = criarCasosDeUso(this.repos, criarServicos());
  readonly cache = CacheDynamoDbServico.criar();
  readonly leitor = CacheDynamoDbServico.criar();
  constructor(readonly db: DynamoMemoria) {}

  async preparar(status: StatusTorneio = "em_andamento") {
    for (const id of ["admin", "host", "u1", "u2", "u3", "u4", "u5"]) {
      await this.repos.usuario.salvar(new Usuario({ id, nome: id, email: `${id}@example.test`, senha: "hash", nickMTGO: `nick-${id}` }));
      if (!id.startsWith("u")) continue;
      await this.repos.deck.salvar(new Deck({ id: `deck-${id}`, usuarioId: id, nome: "Burn", nomeConsolidado: "Burn", formato: "pauper", maindeck: [{ nome: "Mountain", quantidade: 60 }], sideboard: [] }));
    }
    await this.repos.torneio.salvar(new Torneio({ id: T, nome: "Torneio Cache", horario: new Date(), formato: "pauper", donoId: "admin", status, rodadaAtual: status === "inscricoes_abertas" ? 0 : 1, totalRodadas: 2, maxRodadas: 2 }));
    await this.repos.liga.salvar(new Liga({ id: L, nome: "Liga Cache", donoId: "admin", torneioIds: [T] }));
    for (const id of ["u1", "u2", "u3", "u4"]) {
      await this.repos.inscricao.salvar(new Inscricao({ id: `i-${id}`, torneioId: T, usuarioId: id, deckId: `deck-${id}`, checkInRodada: 0 }));
    }
    if (status !== "inscricoes_abertas") {
      await this.repos.partida.salvarVarias([
        new Partida({ id: "p1", torneioId: T, rodada: 1, jogador1Id: "u1", jogador2Id: "u2", deckJogador1Id: "deck-u1", deckJogador2Id: "deck-u2", mesa: 1, status: "pendente", vitoriasJogador1: 0, vitoriasJogador2: 0 }),
        new Partida({ id: "p2", torneioId: T, rodada: 1, jogador1Id: "u3", jogador2Id: "u4", deckJogador1Id: "deck-u3", deckJogador2Id: "deck-u4", mesa: 2, status: "pendente", vitoriasJogador1: 0, vitoriasJogador2: 0 }),
      ]);
    }
  }
  consultas(cache?: CacheDynamoDbServico) {
    const r = this.repos;
    return {
      standings: BuscarStandings.criar(r.torneio, r.inscricao, r.partida, r.usuario, r.deck, r.time, cache),
      partidas: ListarPartidasTorneio.criar(r.torneio, r.partida, r.usuario, cache),
      lista: ListarTorneios.criar(r.torneio, r.inscricao, r.liga, cache),
      seo: BuscarSeoTorneio.criar(r.torneio, cache),
      ranking: RankingLiga.criar(r.liga, r.partida, r.inscricao, r.deck, r.usuario, r.time, r.torneio, cache),
      meta: ListarMetagame.criar(r.torneio, r.inscricao, r.partida, r.deck, r.usuario, cache),
      arquetipo: BuscarArquetipoMetagame.criar(r.torneio, r.inscricao, r.partida, r.deck, r.usuario, cache),
    };
  }
  async visoes(cache?: CacheDynamoDbServico) {
    const q = this.consultas(cache);
    // Consulta excluída deve responder 404, e não recuperar um snapshot anterior.
    const capturar = async (fn: () => Promise<unknown>) => {
      try { return await fn(); } catch (error) {
        if ((error as { status?: number }).status === 404) return { status: 404 };
        throw error;
      }
    };
    return json(await Promise.all([
      capturar(() => q.standings.executar({ torneioId: T })),
      ...[undefined, 1, 2, 3].map((rodada) => capturar(() => q.partidas.executar({ torneioId: T, rodada }))),
      ...[{}, { usuarioId: "u5" }, { status: "finalizado" as const }, { limite: 1, offset: 1 }].map((input) => q.lista.executar(input)),
      capturar(() => q.seo.executar({ torneioId: T })),
      ...[{}, { limiteJogadores: 1, limiteDecks: 1 }].map((input) => q.ranking.executar({ ligaId: L, ...input })),
      ...[7, 30, 90].map((dias) => q.meta.executar({ formato: "pauper", dias })),
    ]));
  }
  async aquecer() {
    const before = await this.visoes(this.cache);
    const reads = this.db.leiturasDados();
    expect(await this.visoes(this.leitor)).toEqual(before);
    // SEO resolve o ID na origem; listar partidas lê o torneio para saber se a rodada está publicada.
    expect(this.db.leiturasDados()).toBe(reads + 5);
    expect([...this.db.itens.keys()].filter((key) => key.startsWith("cache-test/") && !key.includes("__cache_versions"))).toHaveLength(15);
    await this.cache.salvar("site", "independente", { preservado: true }, 3600);
    return before;
  }
  async verificar(before: unknown, mudou = true) {
    const after = await this.visoes(this.leitor);
    expect(after).toEqual(await this.visoes());
    if (mudou) expect(after).not.toEqual(before);
    expect(await this.cache.buscar("site", "independente")).toEqual({ preservado: true });
    return after;
  }
  async resultados() {
    for (const partida of await this.repos.partida.listarPorTorneio(T)) {
      if (partida.status === "pendente" && partida.jogador2Id) {
        await this.casos.registrarResultado.executar({ ...admin, partidaId: partida.id, vitoriasJogador1: 2, vitoriasJogador2: 0 });
      }
    }
  }
}
