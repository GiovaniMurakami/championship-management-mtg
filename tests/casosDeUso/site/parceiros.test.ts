import { describe, expect, it } from "@jest/globals";
import { Parceiro } from "../../../src/dominio/entidade/parceiro";
import { CriarParceiro } from "../../../src/casosDeUso/site/parceiros";
import { ParceiroGateway } from "../../../src/dominio/gateway/parceiroGateway";

class ParceiroGatewayMemoria implements ParceiroGateway {
  public itens: Parceiro[] = [];

  async salvar(parceiro: Parceiro): Promise<void> {
    this.itens.push(parceiro);
  }

  async buscarPorId(id: string): Promise<Parceiro | null> {
    return this.itens.find((item) => item.id === id) ?? null;
  }

  async listar(apenasAtivos = false): Promise<Parceiro[]> {
    return apenasAtivos ? this.itens.filter((item) => item.ativo) : [...this.itens];
  }

  async atualizar(parceiro: Parceiro): Promise<void> {
    const index = this.itens.findIndex((item) => item.id === parceiro.id);
    if (index >= 0) this.itens[index] = parceiro;
  }

  async excluir(id: string): Promise<void> {
    this.itens = this.itens.filter((item) => item.id !== id);
  }
}

describe("parceiros", () => {
  it("cria parceiro com nome e imagem", async () => {
    const gateway = new ParceiroGatewayMemoria();
    const criar = CriarParceiro.criar(gateway);
    const resultado = await criar.executar({
      nome: "CardTrader",
      imagemUrl: "https://cdn.example.com/cardtrader.png",
      linkUrl: "https://cardtrader.com",
      ordem: 1,
    });

    expect(resultado.nome).toBe("CardTrader");
    expect(resultado.imagemUrl).toContain("cardtrader.png");
    expect(gateway.itens).toHaveLength(1);
  });
});
