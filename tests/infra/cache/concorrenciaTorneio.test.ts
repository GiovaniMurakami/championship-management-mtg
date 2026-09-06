import { GetItemCommand, PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoMemoria } from "./support/dynamoMemoria";
import { CenarioTorneio, T, admin } from "./support/cenarioTorneio";
import { cacheSkMetagameLista } from "../../../src/helpers/cache/chavesCache";
import { eventosTorneio } from "../../../src/infra/socketio/eventosTorneio";
import { logger } from "../../../src/helpers/logger";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

describe("concorrência, falhas e dependências do cache de torneio", () => {
  const env = { ...process.env };
  let db: DynamoMemoria;
  let c: CenarioTorneio;
  beforeEach(async () => {
    Object.assign(process.env, { DYNAMODB_DATA_TABLE: "dados-cache-test", DYNAMODB_CACHE_TABLE: "cache-test", DYNAMODB_CACHE_ENABLED: "true", AWS_REGION: "us-east-1", AWS_S3_BUCKET: "cache-test", AWS_S3_REGION: "us-east-1" });
    db = new DynamoMemoria(); db.instalar(); c = new CenarioTorneio(db);
    jest.spyOn(logger, "warn").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
    await c.preparar();
  });
  afterEach(() => { db.restaurar(); jest.restoreAllMocks(); process.env = { ...env }; });

  it("consulta iniciada antes do encerramento não sobrescreve o metagame novo", async () => {
    await c.resultados();
    const ready = deferred(), release = deferred();
    const original = c.repos.torneio.listar.bind(c.repos.torneio);
    const spy = jest.spyOn(c.repos.torneio, "listar").mockImplementationOnce(async (filtros) => {
      const old = await original(filtros);
      ready.resolve();
      await release.promise;
      return old;
    });
    const oldRequest = c.consultas(c.cache).meta.executar({ formato: "pauper" });
    await ready.promise;
    try {
      await c.casos.encerrarTorneio.executar(admin);
      const novo = await c.consultas(c.leitor).meta.executar({ formato: "pauper" });
      expect(novo.totalTorneios).toBe(1);
      release.resolve();
      expect((await oldRequest).totalTorneios).toBe(0);
      expect(await c.consultas(c.leitor).meta.executar({ formato: "pauper" })).toEqual(novo);
    } finally { release.resolve(); await oldRequest; spy.mockRestore(); }
  });

  it("invalidação entre validação e Put de uma consulta real rejeita o snapshot antigo", async () => {
    await c.resultados();
    let interceptado = false;
    db.antes = async command => {
      if (!interceptado && command instanceof PutItemCommand && command.input.TableName === "cache-test" && command.input.Item?.pk.S === "metagame") {
        interceptado = true;
        await c.casos.encerrarTorneio.executar(admin);
      }
    };
    expect((await c.consultas(c.cache).meta.executar({ formato: "pauper" })).totalTorneios).toBe(0);
    expect(interceptado).toBe(true);
    expect((await c.consultas(c.leitor).meta.executar({ formato: "pauper" })).totalTorneios).toBe(1);
  });

  it("não emite sucesso antes da invalidação terminar", async () => {
    await c.aquecer();
    const ready = deferred(), release = deferred();
    let bloqueou = false;
    db.antes = async command => {
      if (!bloqueou && command instanceof UpdateItemCommand && command.input.TableName === "cache-test") {
        bloqueou = true; ready.resolve(); await release.promise;
      }
    };
    const emit = jest.spyOn(eventosTorneio, "emit");
    let terminou = false;
    const mutation = c.casos.alterarTorneio.executar({ ...admin, nome: "Novo nome" }).then(() => { terminou = true; });
    await ready.promise;
    try {
      expect(terminou).toBe(false);
      expect(emit).not.toHaveBeenCalled();
    } finally { release.resolve(); await mutation; }
    expect(emit).toHaveBeenCalledWith("torneio_alterado", { torneioId: T });
    expect((await c.consultas(c.leitor).lista.executar({})).torneios[0].nome).toBe("Novo nome");
  });

  it("falha de leitura da versão usa origem atualizada e não grava cache sem versão", async () => {
    await c.aquecer();
    await c.resultados();
    await c.casos.encerrarTorneio.executar(admin);
    const puts = () => db.comandos.filter(x => x instanceof PutItemCommand && x.input.TableName === "cache-test").length;
    const count = puts();
    db.antes = async command => {
      if (command instanceof GetItemCommand && command.input.TableName === "cache-test" && command.input.Key?.pk.S === "__cache_versions") throw new Error("Falha de versão");
    };
    expect((await c.consultas(c.leitor).meta.executar({ formato: "pauper" })).totalTorneios).toBe(1);
    expect(puts()).toBe(count);
  });

  it("falha ao gravar cache não impede resposta atualizada", async () => {
    await c.aquecer(); await c.resultados(); await c.casos.encerrarTorneio.executar(admin);
    db.antes = async command => {
      if (command instanceof PutItemCommand && command.input.TableName === "cache-test") throw new Error("Falha de Put");
    };
    expect((await c.consultas(c.leitor).meta.executar({ formato: "pauper" })).totalTorneios).toBe(1);
  });

  it("documenta janela residual: falha após persistência deixa metagame antigo até nova invalidação", async () => {
    await c.resultados();
    expect((await c.casos.listarMetagame.executar({ formato: "pauper" })).totalTorneios).toBe(0);
    const emit = jest.spyOn(eventosTorneio, "emit");
    db.antes = async command => {
      if (command instanceof UpdateItemCommand && command.input.TableName === "cache-test") throw new Error("Invalidação indisponível");
    };
    await expect(c.casos.encerrarTorneio.executar(admin)).rejects.toThrow("Invalidação indisponível");
    expect(emit).not.toHaveBeenCalled();
    expect((await c.repos.torneio.buscarPorId(T))?.status).toBe("finalizado");
    // Reproduz a limitação na composição real, onde o metagame tem cache ativo.
    expect((await c.consultas().meta.executar({ formato: "pauper" })).totalTorneios).toBe(1);
    expect((await c.casos.listarMetagame.executar({ formato: "pauper" })).totalTorneios).toBe(0);
    db.antes = undefined;
    await c.cache.invalidarDependencias(["torneios"]);
    expect((await c.casos.listarMetagame.executar({ formato: "pauper" })).totalTorneios).toBe(1);
  });

  it("operação proibida preserva versão e respostas válidas", async () => {
    const before = await c.aquecer();
    const version = await c.cache.obterVersao(`torneio#${T}`);
    await expect(c.casos.alterarTorneio.executar({ ...admin, requisitanteId: "u5", isAdmin: false, nome: "Inválido" })).rejects.toMatchObject({ status: 403 });
    expect(await c.cache.obterVersao(`torneio#${T}`)).toBe(version);
    expect(await c.visoes(c.leitor)).toEqual(before);
  });

  it("repetir check-in não invalida nem altera os resultados", async () => {
    await c.casos.checkInTorneio.executar({ torneioId: T, usuarioId: "u1" });
    const before = await c.aquecer();
    const version = await c.cache.obterVersao(`torneio#${T}`);
    await c.casos.checkInTorneio.executar({ torneioId: T, usuarioId: "u1" });
    expect(await c.cache.obterVersao(`torneio#${T}`)).toBe(version);
    expect(await c.visoes(c.leitor)).toEqual(before);
  });

  it("transação com versão antiga não sobrescreve dados nem invalida o cache vigente", async () => {
    const antigo = (await c.repos.torneio.buscarPorId(T))!;
    await c.casos.alterarTorneio.executar({ ...admin, nome: "Atual" });
    const before = await c.aquecer();
    const version = await c.cache.obterVersao(`torneio#${T}`);
    antigo.nome = "Antigo";
    await expect(c.repos.torneio.atualizar(antigo)).rejects.toThrow("Conflito de concorrencia");
    expect(await c.cache.obterVersao(`torneio#${T}`)).toBe(version);
    expect(await c.visoes(c.leitor)).toEqual(before);
    expect((await c.repos.torneio.buscarPorId(T))?.nome).toBe("Atual");
  });

  it("detalhe do arquétipo, limite de listas e ranking acompanham mudança de deck após o torneio", async () => {
    await c.resultados(); await c.casos.encerrarTorneio.executar(admin);
    const query = { formato: "pauper", slug: "burn", dias: 30 };
    const before = await c.consultas(c.cache).arquetipo.executar(query);
    expect(before.listas).toHaveLength(4);
    expect((await c.consultas(c.leitor).arquetipo.executar({ ...query, limiteListas: 1 })).listas).toHaveLength(1);
    await c.casos.atualizarDeck.executar({ id: "deck-u1", usuarioIdRequisitante: "u1", usuarioNome: "u1", isAdmin: true, nomeConsolidado: "Control" });
    const after = await c.consultas(c.leitor).arquetipo.executar(query);
    expect(after.listas).toHaveLength(3);
    expect(after).toEqual(await c.consultas().arquetipo.executar(query));
    expect((await c.consultas(c.leitor).arquetipo.executar({ formato: "pauper", slug: "control" })).listas).toHaveLength(1);
  });

  it("TTL vencido recalcula na origem sem apagar o payload", async () => {
    const before = await c.consultas(c.cache).meta.executar({ formato: "pauper" });
    const key = `cache-test/metagame/${cacheSkMetagameLista("pauper", 30)}`;
    db.itens.get(key)!.expiresAt = { N: "0" };
    const reads = db.leiturasDados();
    expect(await c.consultas(c.leitor).meta.executar({ formato: "pauper" })).toEqual(before);
    expect(db.leiturasDados()).toBeGreaterThan(reads);
    expect(Number(db.itens.get(key)!.expiresAt.N)).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it.each(["payload corrompido", "item legado sem versão"])("%s é ignorado e substituído pela origem", async tipo => {
    await c.casos.listarMetagame.executar({ formato: "pauper" });
    const key = `cache-test/metagame/${cacheSkMetagameLista("pauper", 30)}`;
    if (tipo === "payload corrompido") db.itens.get(key)!.payload = { S: "{invalid" };
    else delete db.itens.get(key)!.versao;
    const reads = db.leiturasDados();
    expect((await c.casos.listarMetagame.executar({ formato: "pauper" })).totalTorneios).toBe(0);
    expect(db.leiturasDados()).toBeGreaterThan(reads);
    expect(await c.cache.buscar("metagame", cacheSkMetagameLista("pauper", 30))).not.toBeNull();
  });

  it("gerar link de ingresso não invalida dados, mas ingressar invalida", async () => {
    const before = await c.aquecer();
    const version = await c.cache.obterVersao(`torneio#${T}`);
    const link = await c.casos.gerarLinkIngresso.executar(admin);
    expect(await c.cache.obterVersao(`torneio#${T}`)).toBe(version);
    expect(await c.visoes(c.leitor)).toEqual(before);
    await c.casos.ingressarViaTorneio.executar({ token: link.token, usuarioId: "u5", deckId: "deck-u5" });
    expect(await c.cache.obterVersao(`torneio#${T}`)).not.toBe(version);
    await c.verificar(before);
  });

  it("partida externa altera apenas perfil e preserva caches de torneio e metagame", async () => {
    const before = await c.aquecer();
    const version = await c.cache.obterVersao("metagame");
    await c.casos.registrarPartidaExterna.executar("u1", { resultado: "vitoria", data: "2026-01-01" });
    expect(await c.cache.obterVersao("metagame")).toBe(version);
    expect(await c.visoes(c.leitor)).toEqual(before);
    expect((await c.casos.buscarPerfilPublico.executar({ id: "u1" })).estatisticas.vitorias).toBe(1);
  });

  it("composição real mantém metagame em cache e o invalida ao encerrar", async () => {
    // Exercita a ligação de produção, não apenas factories de consulta do teste.
    expect((await c.casos.listarMetagame.executar({ formato: "pauper" })).totalTorneios).toBe(0);
    expect(await c.cache.buscar("metagame", cacheSkMetagameLista("pauper", 30))).not.toBeNull();
    await c.resultados(); await c.casos.encerrarTorneio.executar(admin);
    expect((await c.casos.listarMetagame.executar({ formato: "pauper" })).totalTorneios).toBe(1);
  });
});
