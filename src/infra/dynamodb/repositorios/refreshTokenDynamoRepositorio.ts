import { RefreshTokenData, RefreshTokenGateway } from "../../../dominio/gateway/refreshTokenGateway";
import { hashToken } from "../../../helpers/tokenHash";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type RefreshTokenItem = {
  tokenHash: string;
  usuarioId: string;
  expiresAt: string;
};

export class RefreshTokenDynamoRepositorio extends BaseDynamoRepositorio implements RefreshTokenGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new RefreshTokenDynamoRepositorio();
  }

  public async salvar(dados: RefreshTokenData): Promise<void> {
    const tokenHash = hashToken(dados.token);
    const item: RefreshTokenItem = {
      tokenHash,
      usuarioId: dados.usuarioId,
      expiresAt: dados.expiresAt.toISOString(),
    };

    await this.transactWriteRequests([
      this.toPutRequest(`REFRESH_TOKEN#${tokenHash}`, "DATA", item, { entity: "REFRESH_TOKEN", expiresAt: dados.expiresAt }),
      this.toPutRequest(`USER#${dados.usuarioId}`, `REFRESH_TOKEN#${tokenHash}`, item, { entity: "REFRESH_TOKEN_INDEX", expiresAt: dados.expiresAt }),
    ]);
  }

  public async consumir(token: string): Promise<RefreshTokenData | null> {
    const tokenHash = hashToken(token);
    const item = await this.getJson<RefreshTokenItem>(`REFRESH_TOKEN#${tokenHash}`, "DATA");
    if (!item) return null;

    await this.transactWriteRequests([
      this.toDeleteRequest(`REFRESH_TOKEN#${tokenHash}`, "DATA"),
      this.toDeleteRequest(`USER#${item.usuarioId}`, `REFRESH_TOKEN#${tokenHash}`),
    ]);

    const expiresAt = new Date(item.expiresAt);
    if (expiresAt < new Date()) return null;

    return {
      token,
      usuarioId: item.usuarioId,
      expiresAt,
    };
  }

  public async excluirPorUsuario(usuarioId: string): Promise<void> {
    const itens = await this.queryJson<RefreshTokenItem>(`USER#${usuarioId}`);
    for (const item of itens) {
      await this.transactWriteRequests([
        this.toDeleteRequest(`REFRESH_TOKEN#${item.tokenHash}`, "DATA"),
        this.toDeleteRequest(`USER#${usuarioId}`, `REFRESH_TOKEN#${item.tokenHash}`),
      ]);
    }
  }
}
