export async function comRetry<T>(
  fn: () => Promise<T>,
  tentativas: number,
  delayMs: number
): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (err) {
      ultimoErro = err;
      if (i < tentativas - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** i));
      }
    }
  }
  throw ultimoErro;
}
