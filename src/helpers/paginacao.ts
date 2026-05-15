export const OFFSET_MAXIMO_PADRAO = 5_000;

export type PaginacaoNormalizada = {
  limite: number;
  offset: number;
};

export function normalizarPaginacaoOffset(
  limite: number | undefined,
  offset: number | undefined,
  limitePadrao: number,
  limiteMaximo: number,
  offsetMaximo = OFFSET_MAXIMO_PADRAO
): PaginacaoNormalizada {
  const limiteSeguro = Number.isFinite(limite) ? limite : undefined;
  const offsetSeguro = Number.isFinite(offset) ? offset : undefined;

  const limiteNormalizado = Math.min(
    Math.max(limiteSeguro ?? limitePadrao, 1),
    limiteMaximo
  );
  const offsetNormalizado = Math.min(
    Math.max(offsetSeguro ?? 0, 0),
    offsetMaximo
  );

  return {
    limite: limiteNormalizado,
    offset: offsetNormalizado,
  };
}
