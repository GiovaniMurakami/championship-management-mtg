import { LinkIngressoData, LinkIngressoGateway } from "../../../dominio/gateway/linkIngressoGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type LinkIngressoItem = {
  token: string;
  torneioId: string;
  criadoPorId: string;
  expiresAt: string;
};

export class LinkIngressoDynamoRepositorio extends BaseDynamoRepositorio implements LinkIngressoGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new LinkIngressoDynamoRepositorio();
  }

  public async salvar(dados: LinkIngressoData): Promise<void> {
    await this.putJson<LinkIngressoItem>(
      `LINK_INGRESSO#${dados.token}`,
      "DATA",
      {
        token: dados.token,
        torneioId: dados.torneioId,
        criadoPorId: dados.criadoPorId,
        expiresAt: dados.expiresAt.toISOString(),
      },
      { entity: "LINK_INGRESSO", expiresAt: dados.expiresAt }
    );
  }

  public async buscarPorToken(token: string): Promise<LinkIngressoData | null> {
    const item = await this.getJson<LinkIngressoItem>(`LINK_INGRESSO#${token}`, "DATA");
    if (!item) return null;
    return {
      token: item.token,
      torneioId: item.torneioId,
      criadoPorId: item.criadoPorId,
      expiresAt: new Date(item.expiresAt),
    };
  }

  public async excluirPorToken(token: string): Promise<void> {
    await this.delete(`LINK_INGRESSO#${token}`, "DATA");
  }
}
