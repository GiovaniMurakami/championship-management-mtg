import { HallTop8Gateway } from "../../dominio/gateway/hallTop8Gateway";
import { ImagemGateway } from "../../dominio/gateway/imagemGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { logger } from "../../helpers/logger";

export class ExcluirHallTop8 implements CasoDeUso<{ id: string }, { id: string; excluido: boolean }> {
  private constructor(
    private readonly hallGateway: HallTop8Gateway,
    private readonly imagemGateway: ImagemGateway,
  ) {}

  public static criar(hallGateway: HallTop8Gateway, imagemGateway: ImagemGateway) {
    return new ExcluirHallTop8(hallGateway, imagemGateway);
  }

  public async executar(input: { id: string }) {
    const item = await this.hallGateway.buscarPorId(input.id);
    if (!item) {
      throw ErroPersonalizado.criar({
        mensagem: "Item do Hall da Fama não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const excluido = await this.hallGateway.excluir(input.id);
    if (!excluido) {
      throw ErroPersonalizado.criar({
        mensagem: "Item do Hall da Fama não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    try {
      await this.imagemGateway.excluirPorUrl(item.imagemUrl);
    } catch (erro) {
      logger.warn({ erro, id: item.id, url: item.imagemUrl }, "Falha ao excluir imagem do Hall no S3");
    }

    return { id: input.id, excluido: true };
  }
}
