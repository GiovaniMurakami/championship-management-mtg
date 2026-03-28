export interface TokenBlacklistGateway {
  adicionar(token: string, expiresAt: Date): Promise<void>;
  existe(token: string): Promise<boolean>;
}
