import { parseHorarioBrasilia, toBrasiliaISO } from "../../../src/helpers/data/brasilia";

describe("brasilia helpers", () => {
  it("parseHorarioBrasilia interpreta datetime-local como horário de Brasília", () => {
    const date = parseHorarioBrasilia("2026-07-02T18:28");
    expect(date.toISOString()).toBe("2026-07-02T21:28:00.000Z");
  });

  it("parseHorarioBrasilia preserva valores com offset explícito", () => {
    const date = parseHorarioBrasilia("2026-07-02T18:28:00-03:00");
    expect(date.toISOString()).toBe("2026-07-02T21:28:00.000Z");
  });

  it("toBrasiliaISO serializa instante UTC com offset -03:00", () => {
    const iso = toBrasiliaISO(new Date("2026-07-02T21:28:00.000Z"));
    expect(iso).toBe("2026-07-02T18:28:00.000-03:00");
  });
});
