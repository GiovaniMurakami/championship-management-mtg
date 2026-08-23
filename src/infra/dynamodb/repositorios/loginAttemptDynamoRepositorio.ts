import { LoginAttemptGateway } from "../../../dominio/gateway/loginAttemptGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type LoginAttemptItem = {
  email: string;
  tentativas: number;
  expiresAt: string;
};

const JANELA_TENTATIVAS_MS = 15 * 60 * 1000;

export class LoginAttemptDynamoRepositorio extends BaseDynamoRepositorio implements LoginAttemptGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new LoginAttemptDynamoRepositorio();
  }

  public async registrarFalha(email: string): Promise<void> {
    const atual = await this.getJson<LoginAttemptItem>(this.pk(email), "DATA");
    const expiresAt = atual?.expiresAt && new Date(atual.expiresAt) > new Date()
      ? new Date(atual.expiresAt)
      : new Date(Date.now() + JANELA_TENTATIVAS_MS);

    await this.putJson<LoginAttemptItem>(
      this.pk(email),
      "DATA",
      {
        email,
        tentativas: (atual?.tentativas ?? 0) + 1,
        expiresAt: expiresAt.toISOString(),
      },
      { entity: "LOGIN_ATTEMPT", expiresAt }
    );
  }

  public async obterFalhas(email: string): Promise<number> {
    const item = await this.getJson<LoginAttemptItem>(this.pk(email), "DATA");
    if (!item) return 0;
    if (new Date(item.expiresAt) <= new Date()) return 0;
    return item.tentativas;
  }

  public async resetar(email: string): Promise<void> {
    await this.safeDelete(this.pk(email), "DATA");
  }

  private pk(email: string): string {
    return `LOGIN_ATTEMPT#${email.toLowerCase().trim()}`;
  }
}
