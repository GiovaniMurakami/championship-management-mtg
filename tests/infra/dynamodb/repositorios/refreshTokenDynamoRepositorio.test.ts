import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { RefreshTokenDynamoRepositorio } from "../../../../src/infra/dynamodb/repositorios/refreshTokenDynamoRepositorio";

describe("RefreshTokenDynamoRepositorio - consumo atomico", () => {
  const tabelaOriginal = process.env.DYNAMODB_DATA_TABLE;
  let sendSpy: jest.SpiedFunction<DynamoDBClient["send"]>;

  beforeEach(() => {
    process.env.DYNAMODB_DATA_TABLE = "dados-test";
    sendSpy = jest.spyOn(DynamoDBClient.prototype, "send");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.DYNAMODB_DATA_TABLE = tabelaOriginal;
  });

  it("condiciona a exclusao do token principal para apenas um consumidor vencer", async () => {
    sendSpy
      .mockResolvedValueOnce({ Item: { payload: { S: JSON.stringify({
        tokenHash: "hash",
        usuarioId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }) } } } as never)
      .mockResolvedValueOnce({} as never);

    const resultado = await RefreshTokenDynamoRepositorio.criar().consumir("token");

    expect(sendSpy.mock.calls[0][0]).toBeInstanceOf(GetItemCommand);
    const comando = sendSpy.mock.calls[1][0] as TransactWriteItemsCommand;
    expect(comando.input.TransactItems?.[0].Delete?.ConditionExpression).toBe("attribute_exists(pk)");
    expect(resultado?.usuarioId).toBe("user-1");
  });

  it("retorna null quando outra requisicao ja consumiu o token", async () => {
    sendSpy
      .mockResolvedValueOnce({ Item: { payload: { S: JSON.stringify({
        tokenHash: "hash",
        usuarioId: "user-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }) } } } as never)
      .mockRejectedValueOnce(Object.assign(new Error("concorrencia"), {
        name: "TransactionCanceledException",
      }));

    await expect(RefreshTokenDynamoRepositorio.criar().consumir("token")).resolves.toBeNull();
  });
});
