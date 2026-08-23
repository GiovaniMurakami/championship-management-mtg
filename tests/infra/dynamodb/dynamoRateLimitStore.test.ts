import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoRateLimitStore } from "../../../src/infra/dynamodb/dynamoRateLimitStore";

describe("DynamoRateLimitStore", () => {
  const tabelaOriginal = process.env.DYNAMODB_CACHE_TABLE;
  let sendSpy: jest.SpiedFunction<DynamoDBClient["send"]>;

  beforeEach(() => {
    process.env.DYNAMODB_CACHE_TABLE = "cache-test";
    sendSpy = jest.spyOn(DynamoDBClient.prototype, "send");
  });

  afterEach(() => {
    sendSpy.mockRestore();
    process.env.DYNAMODB_CACHE_TABLE = tabelaOriginal;
  });

  it("incrementa contador compartilhado e devolve o reset", async () => {
    sendSpy.mockResolvedValueOnce({
      Attributes: { totalHits: { N: "3" }, expiresAt: { N: "2000000000" } },
    } as never);
    const store = new DynamoRateLimitStore("auth");

    await expect(store.increment("127.0.0.1")).resolves.toEqual({
      totalHits: 3,
      resetTime: new Date(2_000_000_000_000),
    });
    expect(sendSpy.mock.calls[0][0]).toBeInstanceOf(UpdateItemCommand);
    store.shutdown();
  });

  it("remove janela expirada e tenta incrementar novamente", async () => {
    const expirado = Object.assign(new Error("expirado"), { name: "ConditionalCheckFailedException" });
    sendSpy
      .mockRejectedValueOnce(expirado)
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce({ Attributes: { totalHits: { N: "1" }, expiresAt: { N: "2000000000" } } } as never);
    const store = new DynamoRateLimitStore("auth");

    await expect(store.increment("127.0.0.1")).resolves.toMatchObject({ totalHits: 1 });
    expect(sendSpy.mock.calls[1][0]).toBeInstanceOf(DeleteItemCommand);
    expect(sendSpy.mock.calls[2][0]).toBeInstanceOf(UpdateItemCommand);
    store.shutdown();
  });

  it("le contador com consistencia forte", async () => {
    const futuro = Math.floor(Date.now() / 1000) + 60;
    sendSpy.mockResolvedValueOnce({ Item: { totalHits: { N: "2" }, expiresAt: { N: String(futuro) } } } as never);
    const store = new DynamoRateLimitStore("auth");

    await expect(store.get("ip")).resolves.toMatchObject({ totalHits: 2 });
    expect(sendSpy.mock.calls[0][0]).toBeInstanceOf(GetItemCommand);
    expect((sendSpy.mock.calls[0][0] as GetItemCommand).input.ConsistentRead).toBe(true);
    store.shutdown();
  });
});
