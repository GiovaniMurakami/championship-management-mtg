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

/** Formata um instante para leitura humana no horário oficial de Brasília. */
export function formatarDataHoraBrasilia(date: Date): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} às ${get("hour")}:${get("minute")}`;
}
