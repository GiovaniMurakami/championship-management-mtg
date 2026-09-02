import { randomUUID } from "crypto";
import {
  DeleteItemCommand,
  DescribeTableCommand,
  DynamoDBClient,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { CacheDynamoDbServico } from "../../src/infra/services/cacheDynamoDbServico";
import {
  aguardarInvalidacoesCachePendentes,
  iniciarInvalidadorCacheTorneio,
} from "../../src/infra/cache/invalidadorCacheTorneio";
import { eventosTorneio } from "../../src/infra/socketio/eventosTorneio";
import { CACHE_PK_METAGAME } from "../../src/helpers/cache/chavesCache";

const tabela = process.env.DYNAMODB_CACHE_TABLE ?? "";
const executar = process.env.RUN_DYNAMODB_CACHE_E2E === "true";
const permitirCacheCompartilhado = process.env.E2E_ALLOW_NONLOCAL_CACHE === "true";
const describeCloud = executar ? describe : describe.skip;

describeCloud("E2E - cache DynamoDB cloud", () => {
  jest.setTimeout(60_000);

  const region = process.env.DYNAMODB_CACHE_REGION || "us-east-1";
  const cliente = new DynamoDBClient({ region });
  const cache = CacheDynamoDbServico.criar();
  const chavesCriadas = new Set<string>();
  let tabelaDisponivel = false;

  const salvar = async (pk: string, sk: string, valor: unknown, ttl = 60) => {
    chavesCriadas.add(`${pk}\n${sk}`);
    await cache.salvar(pk, sk, valor, ttl);
  };

  beforeAll(async () => {
    if (!permitirCacheCompartilhado && !/(?:local|test)/i.test(tabela)) {
      throw new Error(
        `DYNAMODB_CACHE_TABLE deve conter "local" ou "test", ou E2E_ALLOW_NONLOCAL_CACHE=true; recebido: "${tabela}".`
      );
    }
    process.env.DYNAMODB_CACHE_ENABLED = "true";
    await cliente.send(new DescribeTableCommand({ TableName: tabela }));
    tabelaDisponivel = true;
    iniciarInvalidadorCacheTorneio(cache);
  });

  afterEach(async () => {
    if (!tabelaDisponivel) return;
    await Promise.all([...chavesCriadas].map(async (chave) => {
      const [pk, sk] = chave.split("\n");
      await cliente.send(new DeleteItemCommand({
        TableName: tabela,
        Key: { pk: { S: pk }, sk: { S: sk } },
      }));
    }));
    chavesCriadas.clear();
  });

  afterAll(() => {
    cliente.destroy();
  });

  it("grava, reutiliza e remove um valor", async () => {
    const pk = `e2e-cache#${randomUUID()}`;
    const sk = "hit-miss";
    const valor = { versao: 1, jogadores: ["Ana", "Bia"] };

    await salvar(pk, sk, valor);

    await expect(cache.buscar(pk, sk)).resolves.toEqual(valor);
    await cache.remover(pk, sk);
    await expect(cache.buscar(pk, sk)).resolves.toBeNull();
  });

  it("nao entrega payload expirado, mesmo antes da limpeza assincrona do DynamoDB", async () => {
    const pk = `e2e-cache#${randomUUID()}`;
    const sk = "expirado";
    const agora = Math.floor(Date.now() / 1000);
    chavesCriadas.add(`${pk}\n${sk}`);

    await cliente.send(new PutItemCommand({
      TableName: tabela,
      Item: {
        pk: { S: pk },
        sk: { S: sk },
        payload: { S: JSON.stringify({ desatualizado: true }) },
        createdAt: { N: String(agora - 10) },
        expiresAt: { N: String(agora - 1) },
      },
    }));

    await expect(cache.buscar(pk, sk)).resolves.toBeNull();
  });

  it("invalida o metagame quando o torneio e finalizado", async () => {
    const torneioId = randomUUID();
    const sk = `e2e#${randomUUID()}`;

    await salvar(CACHE_PK_METAGAME, sk, { versao: "antiga" });
    eventosTorneio.emit("torneio_finalizado", { torneioId });
    await aguardarInvalidacoesCachePendentes();

    await expect(cache.buscar(CACHE_PK_METAGAME, sk)).resolves.toBeNull();
  });
});
