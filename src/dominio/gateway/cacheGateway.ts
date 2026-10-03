export interface CacheGateway {
  buscar<T>(pk: string, sk: string, versao?: string | null): Promise<T | null>;
  salvar<T>(pk: string, sk: string, valor: T, ttlSegundos: number, versao?: string | null): Promise<void>;
  remover(pk: string, sk: string): Promise<void>;
  obterVersao(pk: string): Promise<string | null>;
  invalidarParticao(pk: string): Promise<void>;
}
