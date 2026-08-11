const BRASILIA_OFFSET_HOURS = 3;

/**
 * Converte datetime-local (sem fuso) para instante UTC,
 * interpretando o valor como horário de Brasília (UTC-3).
 */
export function parseHorarioBrasilia(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Horário inválido.");
  }

  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }

  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/
  );

  if (!match) {
    return new Date(trimmed);
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) + BRASILIA_OFFSET_HOURS,
      Number(minute),
      Number(second)
    )
  );
}

/** Serializa Date UTC para ISO com offset -03:00 (horário de Brasília). */
export function toBrasiliaISO(date?: Date): string | undefined {
  if (!date) return undefined;
  const shifted = new Date(date.getTime() - BRASILIA_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.toISOString().replace("Z", "-03:00");
}

export function agoraBrasiliaISO(): string {
  return toBrasiliaISO(new Date())!;
}
