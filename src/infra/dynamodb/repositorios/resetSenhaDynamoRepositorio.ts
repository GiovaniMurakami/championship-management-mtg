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

    await Promise.all([
      this.putJson(`RESET_SENHA#${tokenHash}`, "DATA", item, { entity: "RESET_SENHA", expiresAt: dados.expiresAt }),
      this.putJson(`USER#${dados.usuarioId}`, `RESET_SENHA#${tokenHash}`, item, { entity: "RESET_SENHA_INDEX", expiresAt: dados.expiresAt }),
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
    await this.safeDelete(`RESET_SENHA#${tokenHash}`, "DATA");
    if (item) {
      await this.safeDelete(`USER#${item.usuarioId}`, `RESET_SENHA#${tokenHash}`);
    }
  }

  public async excluirPorUsuario(usuarioId: string): Promise<void> {
    const itens = await this.queryJson<ResetSenhaItem>(`USER#${usuarioId}`);
    await Promise.all(itens.map((item) => Promise.all([
      this.safeDelete(`RESET_SENHA#${item.tokenHash}`, "DATA"),
      this.safeDelete(`USER#${usuarioId}`, `RESET_SENHA#${item.tokenHash}`),
    ])));
  }
}
