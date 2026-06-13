export async function comRetry<T>(
  fn: () => Promise<T>,
  tentativas: number,
  delayMs: number,
  shouldRetry: (err: unknown, tentativaAtual: number) => boolean = () => true
): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (err) {
      ultimoErro = err;
      if (i < tentativas - 1 && shouldRetry(err, i + 1)) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** i));
        continue;
      }
      break;
    }
  }
  throw ultimoErro;
}
