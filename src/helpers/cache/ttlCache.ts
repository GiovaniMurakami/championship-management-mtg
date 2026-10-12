export function getCacheTtlSegundos(nomeEnv: string, padrao: number): number {
  const valor = Number(process.env[nomeEnv]);
  return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : padrao;
}
