import { resolverIntervaloDatas } from "../../../src/helpers/data/intervaloDatas";
import { listarMetagameQuerySchema, metagameDiasQuerySchema, perfilPublicoQuerySchema } from "../../../src/helpers/validacao/schemas";

it("inclui os dois limites do dia de Brasília, mesmo em um intervalo de um dia", () => {
  const intervalo = resolverIntervaloDatas({ dataInicio: "2026-08-01", dataFim: "2026-08-01" });
  expect(intervalo?.dataInicio.toISOString()).toBe("2026-08-01T03:00:00.000Z");
  expect(intervalo?.dataFim.toISOString()).toBe("2026-08-02T02:59:59.999Z");
  expect(resolverIntervaloDatas({})).toBeUndefined();
});

it.each([
  { dataInicio: "2026-02-30", dataFim: "2026-03-01" },
  { dataInicio: "2026-08-02", dataFim: "2026-08-01" },
  { dataInicio: "2026-08-01" },
  { dataFim: "2026-08-01" },
])("rejeita datas inválidas, incompletas e invertidas: %j", range => {
  expect(() => resolverIntervaloDatas(range)).toThrow();
  for (const schema of [listarMetagameQuerySchema, metagameDiasQuerySchema, perfilPublicoQuerySchema]) {
    expect(schema.safeParse({ formato: "pauper", ...range }).success).toBe(false);
  }
});
