import { randomUUID } from "crypto";
import { type WriteRequest } from "@aws-sdk/client-dynamodb";
import { BaseDynamoRepositorio } from "../../src/infra/dynamodb/repositorios/baseDynamoRepositorio";

type RegistroE2e = {
  id: string;
  marcador: string;
  conteudo: string;
};

class RepositorioE2e extends BaseDynamoRepositorio {
  public constructor() {
    super();
  }

  public salvarTodos(pk: string, registros: RegistroE2e[]): Promise<void> {
    return this.batchWrite(
      registros.map((registro) => this.toPutRequest(pk, `ITEM#${registro.id}`, registro))
    );
  }

  public listarTodos(pk: string): Promise<RegistroE2e[]> {
    return this.queryJson<RegistroE2e>(pk);
  }

  public removerTodos(pk: string, ids: string[]): Promise<void> {
    const requests: WriteRequest[] = ids.map((id) => this.toDeleteRequest(pk, `ITEM#${id}`));
    return this.batchWrite(requests);
  }

  public fechar(): void {
    this.cliente.destroy();
  }
}

const executar = process.env.RUN_DYNAMODB_DATA_E2E === "true";
const describeDynamo = executar ? describe : describe.skip;

describeDynamo("E2E - paginacao da tabela de dados DynamoDB", () => {
  const tabela = process.env.DYNAMODB_DATA_TABLE ?? "";
  const runId = randomUUID();
  const pk = `E2E#PAGINACAO#${runId}`;
  const ids = Array.from({ length: 30 }, (_, indice) => `${runId}-${indice}`);
  const repositorio = new RepositorioE2e();

  beforeAll(() => {
    if (!/(local|test)/i.test(tabela)) {
      throw new Error(
        `E2E bloqueado: DYNAMODB_DATA_TABLE deve apontar para tabela local/teste, recebido: ${tabela || "vazio"}`
      );
    }
  });

  afterAll(async () => {
    try {
      await repositorio.removerTodos(pk, ids);
    } finally {
      repositorio.fechar();
    }
  });

  it("grava lotes maiores que 25 e le todas as paginas acima de 1 MB", async () => {
    const conteudo = "x".repeat(40 * 1024);
    const registros = ids.map((id) => ({ id, marcador: runId, conteudo }));

    await repositorio.salvarTodos(pk, registros);
    const resultado = await repositorio.listarTodos(pk);

    expect(resultado).toHaveLength(registros.length);
    expect(resultado.map((item) => item.id).sort()).toEqual([...ids].sort());
    expect(resultado.every((item) => item.marcador === runId)).toBe(true);
  }, 120_000);
});
