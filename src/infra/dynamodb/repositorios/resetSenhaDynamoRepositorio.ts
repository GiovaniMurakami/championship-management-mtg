import { ResetSenhaData, ResetSenhaGateway } from "../../../dominio/gateway/resetSenhaGateway";
import { hashToken } from "../../../helpers/tokenHash";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type ResetSenhaItem = {
  tokenHash: string;
  usuarioId: string;
  expiresAt: string;
};

export class ResetSenhaDynamoRepositorio extends BaseDynamoRepositorio implements ResetSenhaGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new ResetSenhaDynamoRepositorio();
  }

  public async salvar(dados: ResetSenhaData): Promise<void> {
    const tokenHash = hashToken(dados.token);
    const item: ResetSenhaItem = {
      tokenHash,
      usuarioId: dados.usuarioId,
      expiresAt: dados.expiresAt.toISOString(),
    };

    await this.transactWriteRequests([
      this.toPutRequest(`RESET_SENHA#${tokenHash}`, "DATA", item, { entity: "RESET_SENHA", expiresAt: dados.expiresAt }),
      this.toPutRequest(`USER#${dados.usuarioId}`, `RESET_SENHA#${tokenHash}`, item, { entity: "RESET_SENHA_INDEX", expiresAt: dados.expiresAt }),
    ]);
  }

  public async buscarPorToken(token: string): Promise<ResetSenhaData | null> {
    const tokenHash = hashToken(token);
    const item = await this.getJson<ResetSenhaItem>(`RESET_SENHA#${tokenHash}`, "DATA");
    if (!item) return null;
    return {
      token,
      usuarioId: item.usuarioId,
      expiresAt: new Date(item.expiresAt),
    };
  }

  public async excluirPorToken(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const item = await this.getJson<ResetSenhaItem>(`RESET_SENHA#${tokenHash}`, "DATA");
    const requests = [this.toDeleteRequest(`RESET_SENHA#${tokenHash}`, "DATA")];
    if (item) requests.push(this.toDeleteRequest(`USER#${item.usuarioId}`, `RESET_SENHA#${tokenHash}`));
    await this.transactWriteRequests(requests);
  }

  public async excluirPorUsuario(usuarioId: string): Promise<void> {
    const itens = await this.queryJson<ResetSenhaItem>(`USER#${usuarioId}`);
    for (const item of itens) {
      await this.transactWriteRequests([
        this.toDeleteRequest(`RESET_SENHA#${item.tokenHash}`, "DATA"),
        this.toDeleteRequest(`USER#${usuarioId}`, `RESET_SENHA#${item.tokenHash}`),
      ]);
    }
  }
}
