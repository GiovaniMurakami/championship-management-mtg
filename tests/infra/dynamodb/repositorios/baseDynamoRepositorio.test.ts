import {
  BatchWriteItemCommand,
  DynamoDBClient,
  QueryCommand,
  type WriteRequest,
} from "@aws-sdk/client-dynamodb";
import {
  BaseDynamoRepositorio,
  MAX_TENTATIVAS_BATCH_WRITE,
} from "../../../../src/infra/dynamodb/repositorios/baseDynamoRepositorio";

class RepositorioTeste extends BaseDynamoRepositorio {
  public constructor() {
    super();
  }

  public consultar<T>(pk: string): Promise<T[]> {
    return this.queryJson<T>(pk);
  }

  public gravar(requests: WriteRequest[]): Promise<void> {
    return this.batchWrite(requests);
  }

  protected async aguardarRetryBatch(): Promise<void> {
    return Promise.resolve();
  }
}

const putRequest = (id: string): WriteRequest => ({
  PutRequest: {
    Item: {
      pk: { S: "TESTE" },
      sk: { S: id },
      payload: { S: JSON.stringify({ id }) },
    },
  },
});

describe("BaseDynamoRepositorio", () => {
  const tabelaOriginal = process.env.DYNAMODB_DATA_TABLE;
  let sendSpy: jest.SpiedFunction<DynamoDBClient["send"]>;

  beforeEach(() => {
    process.env.DYNAMODB_DATA_TABLE = "tabela-teste";
    sendSpy = jest.spyOn(DynamoDBClient.prototype, "send");
  });

  afterEach(() => {
    sendSpy.mockRestore();
    process.env.DYNAMODB_DATA_TABLE = tabelaOriginal;
  });

  it("consulta todas as paginas ate LastEvaluatedKey acabar", async () => {
    sendSpy
      .mockResolvedValueOnce({
        Items: [{ payload: { S: JSON.stringify({ id: "1" }) } }],
        LastEvaluatedKey: { pk: { S: "TESTE" }, sk: { S: "1" } },
      } as never)
      .mockResolvedValueOnce({
        Items: [
          { payload: { S: JSON.stringify({ id: "2" }) } },
          { pk: { S: "item-sem-payload" } },
        ],
      } as never);

    const resultado = await new RepositorioTeste().consultar<{ id: string }>("TESTE");

    expect(resultado).toEqual([{ id: "1" }, { id: "2" }]);
    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy.mock.calls[0][0]).toBeInstanceOf(QueryCommand);
    expect((sendSpy.mock.calls[0][0] as QueryCommand).input.ConsistentRead).toBe(true);
    expect((sendSpy.mock.calls[0][0] as QueryCommand).input.ExclusiveStartKey).toBeUndefined();
    expect((sendSpy.mock.calls[1][0] as QueryCommand).input.ExclusiveStartKey).toEqual({
      pk: { S: "TESTE" },
      sk: { S: "1" },
    });
  });

  it("reenvia somente os itens nao processados do batch", async () => {
    const processado = putRequest("1");
    const pendente = putRequest("2");
    sendSpy
      .mockResolvedValueOnce({
        UnprocessedItems: { "tabela-teste": [pendente] },
      } as never)
      .mockResolvedValueOnce({ UnprocessedItems: {} } as never);

    await new RepositorioTeste().gravar([processado, pendente]);

    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy.mock.calls[0][0]).toBeInstanceOf(BatchWriteItemCommand);
    expect((sendSpy.mock.calls[1][0] as BatchWriteItemCommand).input.RequestItems).toEqual({
      "tabela-teste": [pendente],
    });
  });

  it("falha depois do limite quando o DynamoDB nunca processa o item", async () => {
    const pendente = putRequest("1");
    sendSpy.mockResolvedValue({
      UnprocessedItems: { "tabela-teste": [pendente] },
    } as never);

    await expect(new RepositorioTeste().gravar([pendente])).rejects.toThrow(
      `apos ${MAX_TENTATIVAS_BATCH_WRITE} tentativas`
    );
    expect(sendSpy).toHaveBeenCalledTimes(MAX_TENTATIVAS_BATCH_WRITE);
  });
});
