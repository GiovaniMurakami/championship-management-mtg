export interface LoginAttemptGateway {
  registrarFalha(email: string): Promise<void>;
  obterFalhas(email: string): Promise<number>;
  resetar(email: string): Promise<void>;
}
