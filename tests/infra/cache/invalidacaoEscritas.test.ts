import { DynamoDBClient, QueryCommand, GetItemCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand, TransactWriteItemsCommand, BatchWriteItemCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import { CacheDynamoDbServico } from "../../../src/infra/services/cacheDynamoDbServico";
import { BaseDynamoRepositorio } from "../../../src/infra/dynamodb/repositorios/baseDynamoRepositorio";
import { DominioCache } from "../../../src/helpers/cache/dependenciasCache";
import { InscricaoDynamoRepositorio } from "../../../src/infra/dynamodb/repositorios/inscricaoDynamoRepositorio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";

import { CheckInTorneio } from "../../../src/casosDeUso/torneio/checkInTorneio";
import { BuscarStandings } from "../../../src/casosDeUso/torneio/buscarStandings";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { criarMockTorneioGateway, criarMockUsuarioGateway, criarMockPartidaGateway, criarMockDeckGateway, criarMockTimeGateway } from "../../mocks/gateways";

type Item = Record<string, AttributeValue>;
class Escrita extends BaseDynamoRepositorio {
  constructor(dominio?: DominioCache) { super(dominio); }
  async executar(tipo: string) {
    const pk = "TEST", sk = "DATA", payload = { atualizado: true };
    const request = this.toPutRequest(pk, sk, payload);
    if (tipo === "put") return this.putJson(pk, sk, payload);
    if (tipo === "delete") return this.delete(pk, sk);
    if (tipo === "update") return this.updatePayloadIf(pk, sk, payload);
    if (tipo === "batch") return this.batchWrite([request]);
    if (tipo === "transact-requests") return this.transactWriteRequests([request]);
    if (tipo === "transact-put") return this.transactPutJson([{ pk, sk, payload }]);
    return this.transactWrite([{ Put: { TableName: this.tabela, Item: request.PutRequest!.Item! } }]);
  }
}

describe("invalidação de caches após persistência", () => {
  let cache: CacheDynamoDbServico;
  let outraLambda: CacheDynamoDbServico;
  let itens: Map<string, Item>;
  let send: jest.SpyInstance;
  const env = { ...process.env };
  const key = (table: string | undefined, item: Item) => `${table}/${item.pk.S}/${item.sk.S}`;

  beforeEach(() => {
    process.env.DYNAMODB_DATA_TABLE = "data-test";
    process.env.DYNAMODB_CACHE_TABLE = "cache-test";
    process.env.DYNAMODB_CACHE_ENABLED = "true";
    itens = new Map();
    send = jest.spyOn(DynamoDBClient.prototype, "send").mockImplementation((async (command: unknown) => {
      if (command instanceof GetItemCommand) return { Item: itens.get(key(command.input.TableName, command.input.Key!)) };
      if (command instanceof QueryCommand) {
        const prefix = `${command.input.TableName}/${command.input.ExpressionAttributeValues![":pk"].S}/`;
        return { Items: [...itens.entries()].filter(([id]) => id.startsWith(prefix)).map(([, item]) => item) };
      }
      if (command instanceof PutItemCommand) itens.set(key(command.input.TableName, command.input.Item!), command.input.Item!);
      if (command instanceof DeleteItemCommand) itens.delete(key(command.input.TableName, command.input.Key!));
      if (command instanceof UpdateItemCommand && command.input.TableName === "cache-test") {
        const id = key(command.input.TableName, command.input.Key!);
        const item = { ...itens.get(id), ...command.input.Key };
        for (const [name, attr] of Object.entries(command.input.ExpressionAttributeNames!)) {
          item[attr] = command.input.ExpressionAttributeValues![name.replace("#d", ":v")];
        }
        itens.set(id, item);
      }
      if (command instanceof TransactWriteItemsCommand) {
        for (const op of command.input.TransactItems!) {
          if (op.Put) itens.set(key(op.Put.TableName, op.Put.Item!), op.Put.Item!);
          if (op.Delete) itens.delete(key(op.Delete.TableName, op.Delete.Key!));
        }
      }
      if (command instanceof BatchWriteItemCommand) return { UnprocessedItems: {} };
      return {};
    }) as never);
    cache = CacheDynamoDbServico.criar();
    outraLambda = CacheDynamoDbServico.criar();
  });
  afterEach(() => { send.mockRestore(); process.env = { ...env }; });

  it.each(["put", "delete", "update", "batch", "transact-requests", "transact-put", "transact"])("aguarda invalidação em %s", async (tipo) => {
    await cache.salvar("torneio#t1", "standings", { checkIn: -1 }, 60);
    await expect(outraLambda.buscar("torneio#t1", "standings")).resolves.toEqual({ checkIn: -1 });
    await new Escrita("inscricoes").executar(tipo);
    await expect(outraLambda.buscar("torneio#t1", "standings")).resolves.toBeNull();
  });

  it.each([
    ["torneios", ["torneio#t1", "torneios", "ligas", "metagame"]],
    ["inscricoes", ["torneio#t1", "torneios", "ligas", "metagame"]],
    ["partidas", ["torneio#t1", "ligas", "metagame"]],
    ["usuarios", ["torneio#t1", "ligas", "metagame"]],
    ["decks", ["torneio#t1", "ligas", "metagame"]],
    ["times", ["torneio#t1", "ligas"]],
    ["ligas", ["ligas"]],
    ["site", ["site"]],
    ["visualizacoesTorneio", ["torneios"]],
  ] as [DominioCache, string[]][])("invalida respostas dependentes de %s e preserva as demais", async (dominio, afetados) => {
    const pks = ["torneio#t1", "torneios", "ligas", "metagame", "site"];
    for (const pk of pks) await cache.salvar(pk, "resposta", { antigo: true }, 60);
    await new Escrita(dominio).executar("transact");
    for (const pk of pks) {
      expect(await outraLambda.buscar(pk, "resposta")).toEqual(afetados.includes(pk) ? null : { antigo: true });
    }
  });

  it("invalida todas as rodadas e rankings após atualizar uma inscrição real", async () => {
    for (const sk of ["standings", "partidas#todas", "partidas#rodada=1", "partidas#rodada=2"]) {
      await cache.salvar("torneio#t1", sk, { checkInRodada: -1 }, 60);
    }
    const repo = InscricaoDynamoRepositorio.criar();
    await repo.atualizar(new Inscricao({ id: "i1", torneioId: "t1", usuarioId: "u1", checkInRodada: 2, dropped: false }));
    expect((await repo.buscarPorTorneioEUsuario("t1", "u1"))?.checkInRodada).toBe(2);
    for (const sk of ["standings", "partidas#todas", "partidas#rodada=1", "partidas#rodada=2"]) {
      await expect(outraLambda.buscar("torneio#t1", sk)).resolves.toBeNull();
    }
  });

  it("a consulta após check-in recalcula a classificação antes do TTL expirar", async () => {
    const torneio = new Torneio({ id: "t1", nome: "T", horario: new Date(Date.now() + 30 * 60 * 1000), formato: "pauper", donoId: "d", status: "inscricoes_abertas", rodadaAtual: 0, totalRodadas: 0 });
    const usuario = new Usuario({ id: "u1", nome: "Ana", email: "ana@example.com", senha: "hash", nickMTGO: "ana" });
    const torneios = criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) });
    const usuarios = criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario), buscarVarios: jest.fn().mockResolvedValue([usuario]) });
    const inscricoes = InscricaoDynamoRepositorio.criar();
    await inscricoes.salvar(new Inscricao({ id: "i1", torneioId: "t1", usuarioId: "u1", checkInRodada: -1, dropped: false }));
    const standings = BuscarStandings.criar(torneios, inscricoes, criarMockPartidaGateway(), usuarios, criarMockDeckGateway(), criarMockTimeGateway(), outraLambda);
    expect((await standings.executar({ torneioId: "t1" })).standings[0].checkInRodada).toBe(-1);
    await expect(cache.buscar("torneio#t1", "standings")).resolves.not.toBeNull();
    await CheckInTorneio.criar(torneios, inscricoes, usuarios).executar({ torneioId: "t1", usuarioId: "u1" });
    expect((await standings.executar({ torneioId: "t1" })).standings[0].checkInRodada).toBe(0);
  });

  it("não deixa consulta anterior à escrita repovoar o cache com dados antigos", async () => {
    const versaoAntiga = await cache.obterVersao("metagame");
    await new Escrita("partidas").executar("transact");
    await outraLambda.salvar("metagame", "lista", { novo: true }, 60);
    await cache.salvar("metagame", "lista", { antigo: true }, 60, versaoAntiga);
    await expect(outraLambda.buscar("metagame", "lista")).resolves.toEqual({ novo: true });
  });

  it("rejeita geração antiga mesmo se a invalidação acontecer entre validação e Put do cache", async () => {
    const versao = await cache.obterVersao("metagame");
    const original = send.getMockImplementation()!;
    let interceptado = false;
    send.mockImplementation(async (command: unknown) => {
      if (!interceptado && command instanceof PutItemCommand && command.input.TableName === "cache-test") {
        interceptado = true;
        await outraLambda.invalidarDependencias(["partidas"]);
      }
      return original(command);
    });
    await cache.salvar("metagame", "lista", { antigo: true }, 60, versao);
    await expect(outraLambda.buscar("metagame", "lista")).resolves.toBeNull();
  });

  it("não invalida quando a transação de dados falha", async () => {
    await cache.salvar("metagame", "lista", { valido: true }, 60);
    send.mockRejectedValueOnce(new Error("transaction conflict"));
    await expect(new Escrita("partidas").executar("transact")).rejects.toThrow("transaction conflict");
    await expect(cache.buscar("metagame", "lista")).resolves.toEqual({ valido: true });
  });

  it("não retorna sucesso da escrita quando a invalidação falha", async () => {
    const original = send.getMockImplementation()!;
    send.mockImplementation(async (command: unknown) => {
      if (command instanceof UpdateItemCommand && (command as UpdateItemCommand).input.TableName === "cache-test") {
        throw new Error("cache indisponivel");
      }
      return original(command);
    });
    await expect(new Escrita("inscricoes").executar("transact")).rejects.toThrow("cache indisponivel");
  });

  it("ignora cache se não consegue verificar a geração e não armazena o cálculo", async () => {
    send.mockRejectedValueOnce(new Error("read failed"));
    const versao = await cache.obterVersao("metagame");
    expect(versao).toBeNull();
    await expect(cache.buscar("metagame", "lista", versao)).resolves.toBeNull();
    await cache.salvar("metagame", "lista", {}, 60, versao);
    expect([...itens.keys()].some((id) => id.includes("/metagame/"))).toBe(false);
  });

  it("invalida partição sem varrer ou apagar itens um a um", async () => {
    await cache.salvar("metagame", "a", {}, 60);
    await cache.salvar("metagame", "b", {}, 60);
    send.mockClear();
    await cache.invalidarParticao("metagame");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(UpdateItemCommand);
    await expect(outraLambda.buscar("metagame", "a")).resolves.toBeNull();
    await expect(outraLambda.buscar("metagame", "b")).resolves.toBeNull();
  });

  it("não invalida caches de negócio em escritas sem dependências (autenticação)", async () => {
    await new Escrita().executar("transact");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("não usa DynamoDB de cache quando desabilitado", async () => {
    process.env.DYNAMODB_CACHE_ENABLED = "false";
    await new Escrita("inscricoes").executar("transact");
    expect(send).toHaveBeenCalledTimes(1);
  });
});
