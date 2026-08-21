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
import {
  CACHE_PK_LIGAS,
  CACHE_PK_METAGAME,
  CACHE_PK_TORNEIOS,
  cachePkTorneio,
} from "../../src/helpers/cache/chavesCache";

const tabela = process.env.DYNAMODB_CACHE_TABLE ?? "";
const executar = process.env.RUN_DYNAMODB_CACHE_E2E === "true";
const describeCloud = executar ? describe : describe.skip;

const EVENTOS_QUE_INVALIDAM_CACHE = [
  "torneio_criado",
  "torneio_alterado",
  "torneio_excluido",
  "participante_inscrito",
  "checkin_realizado",
  "deck_inserido",
  "torneio_iniciado",
  "rodada_iniciada",
  "torneio_finalizado",
  "resultado_registrado",
  "resultado_confirmado",
  "resultado_contestado",
  "resultado_ajustado",
  "mesa_atualizada",
  "pareamentos_atualizados",
  "rodada_refeita",
  "jogador_dropou",
  "jogador_voltou",
  "jogador_ingressou",
  "total_rodadas_alterado",
] as const;

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
    if (!/(?:local|test)/i.test(tabela)) {
      throw new Error(
        `DYNAMODB_CACHE_TABLE deve conter "local" ou "test" para executar o E2E; recebido: "${tabela}".`
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

  it.each(EVENTOS_QUE_INVALIDAM_CACHE)(
    "invalida todas as visoes derivadas no evento %s",
    async (evento) => {
      const torneioId = randomUUID();
      const sk = `e2e#${randomUUID()}`;
      const particoes = [
        cachePkTorneio(torneioId),
        CACHE_PK_METAGAME,
        CACHE_PK_TORNEIOS,
        CACHE_PK_LIGAS,
      ];

      await Promise.all(particoes.map((pk) => salvar(pk, sk, { versao: "antiga" })));
      eventosTorneio.emit(evento, { torneioId });
      await aguardarInvalidacoesCachePendentes();

      await Promise.all(particoes.map(async (pk) => {
        await expect(cache.buscar(pk, sk)).resolves.toBeNull();
      }));
    }
  );
});
