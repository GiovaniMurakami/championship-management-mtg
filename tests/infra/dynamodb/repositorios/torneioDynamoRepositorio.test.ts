import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { Partida } from "../../../../src/dominio/entidade/partida";
import { Torneio } from "../../../../src/dominio/entidade/torneio";
import { PartidaDynamoRepositorio } from "../../../../src/infra/dynamodb/repositorios/partidaDynamoRepositorio";
import { TorneioDynamoRepositorio } from "../../../../src/infra/dynamodb/repositorios/torneioDynamoRepositorio";

const criarTorneio = (version = 2) => new Torneio({
  id: "t-1",
  nome: "Torneio",
  horario: new Date("2026-08-21T12:00:00.000Z"),
  formato: "Pauper",
  donoId: "u-1",
  status: "em_andamento",
  rodadaAtual: 2,
  totalRodadas: 4,
  version,
});

describe("TorneioDynamoRepositorio - consistencia", () => {
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

  it("condiciona a atualizacao pela versao lida e incrementa a versao", async () => {
    const torneio = criarTorneio();
    sendSpy
      .mockResolvedValueOnce({ Item: { payload: { S: JSON.stringify({
        ...torneio,
        horario: torneio.horario.toISOString(),
        criadoEm: torneio.criadoEm.toISOString(),
      }) } } } as never)
      .mockResolvedValueOnce({} as never);

    await TorneioDynamoRepositorio.criar().atualizar(torneio);

    expect(sendSpy.mock.calls[0][0]).toBeInstanceOf(GetItemCommand);
    const comando = sendSpy.mock.calls[1][0] as TransactWriteItemsCommand;
    expect(comando).toBeInstanceOf(TransactWriteItemsCommand);
    expect(comando.input.TransactItems?.[0].Put?.ConditionExpression).toContain("#version = :version");
    expect(comando.input.TransactItems?.[0].Put?.ExpressionAttributeValues?.[":version"]).toEqual({ N: "2" });
    expect(torneio.version).toBe(3);
  });

  it("remove as partidas criadas quando a publicacao da rodada falha", async () => {
    const torneio = criarTorneio();
    const partida = new Partida({
      id: "p-1",
      torneioId: torneio.id,
      rodada: 3,
      jogador1Id: "u-1",
      jogador2Id: "u-2",
    });
    const salvar = jest.spyOn(PartidaDynamoRepositorio.prototype, "salvarVarias").mockResolvedValue();
    const excluir = jest.spyOn(PartidaDynamoRepositorio.prototype, "excluirPorIds").mockResolvedValue(1);
    const repositorio = TorneioDynamoRepositorio.criar();
    jest.spyOn(repositorio, "atualizar").mockRejectedValue(new Error("conflito"));

    await expect(repositorio.atualizarECriarPartidas(torneio, [partida])).rejects.toThrow("conflito");

    expect(salvar).toHaveBeenCalledWith([partida]);
    expect(excluir).toHaveBeenCalledWith([partida.id]);
  });

  it("inicializa o contador atomico a partir do valor legado antes de incrementar", async () => {
    const torneio = criarTorneio();
    torneio.visualizacoes = 247;
    sendSpy
      .mockResolvedValueOnce({ Item: { payload: { S: JSON.stringify({
        ...torneio,
        horario: torneio.horario.toISOString(),
        criadoEm: torneio.criadoEm.toISOString(),
      }) } } } as never)
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce({ Item: { payload: { S: JSON.stringify({
        ...torneio,
        visualizacoes: 247,
        horario: torneio.horario.toISOString(),
        criadoEm: torneio.criadoEm.toISOString(),
      }) }, visualizacoes: { N: "248" } } } as never);

    const atualizado = await TorneioDynamoRepositorio.criar().incrementarVisualizacoes(torneio.id);

    const comando = sendSpy.mock.calls[1][0] as TransactWriteItemsCommand;
    const update = comando.input.TransactItems?.[0].Update;
    expect(update?.UpdateExpression).toContain("if_not_exists(visualizacoes, :base)");
    expect(update?.ExpressionAttributeValues?.[":base"]).toEqual({ N: "247" });
    expect(atualizado?.visualizacoes).toBe(248);
  });
});
