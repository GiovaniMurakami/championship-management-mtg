import {
  derivarTabelaCacheDaData,
  extrairEstagioTabelaDynamo,
  resolverTabelaCacheDynamo,
} from "../../src/helpers/dynamodbTabelas";

describe("dynamodbTabelas", () => {
  it("extrai o estágio do nome da tabela", () => {
    expect(extrairEstagioTabelaDynamo("championship-management-mtg-local-data")).toBe("local");
    expect(extrairEstagioTabelaDynamo("championship-management-mtg-dev-cache")).toBe("dev");
    expect(extrairEstagioTabelaDynamo("outra-tabela")).toBeNull();
  });

  it("deriva cache a partir da data", () => {
    expect(derivarTabelaCacheDaData("championship-management-mtg-local-data"))
      .toBe("championship-management-mtg-local-cache");
    expect(derivarTabelaCacheDaData("championship-management-mtg-dev-data"))
      .toBe("championship-management-mtg-dev-cache");
  });

  it("alinha cache ao stage da data quando estiver misturado", () => {
    expect(resolverTabelaCacheDynamo(
      "championship-management-mtg-local-data",
      "championship-management-mtg-dev-cache",
    )).toBe("championship-management-mtg-local-cache");
  });

  it("mantém cache explícito quando o stage bate", () => {
    expect(resolverTabelaCacheDynamo(
      "championship-management-mtg-dev-data",
      "championship-management-mtg-dev-cache",
    )).toBe("championship-management-mtg-dev-cache");
  });

  it("deriva cache quando a env de cache está vazia", () => {
    expect(resolverTabelaCacheDynamo(
      "championship-management-mtg-prod-data",
      "",
    )).toBe("championship-management-mtg-prod-cache");
  });
});
