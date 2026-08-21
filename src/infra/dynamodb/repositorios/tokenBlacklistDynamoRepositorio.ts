import { TokenBlacklistGateway } from "../../../dominio/gateway/tokenBlacklistGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type TokenBlacklistItem = {
  token: string;
  expiresAt: string;
};

export class TokenBlacklistDynamoRepositorio extends BaseDynamoRepositorio implements TokenBlacklistGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new TokenBlacklistDynamoRepositorio();
  }

  public async adicionar(token: string, expiresAt: Date): Promise<void> {
    await this.putJson<TokenBlacklistItem>(
      `TOKEN_BLACKLIST#${token}`,
      "DATA",
      { token, expiresAt: expiresAt.toISOString() },
      { entity: "TOKEN_BLACKLIST", expiresAt }
    );
  }

  public async existe(token: string): Promise<boolean> {
    const item = await this.getJson<TokenBlacklistItem>(`TOKEN_BLACKLIST#${token}`, "DATA");
    if (!item) return false;
    return new Date(item.expiresAt) > new Date();
  }
}
