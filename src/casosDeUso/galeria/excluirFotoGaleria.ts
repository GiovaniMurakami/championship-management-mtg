import { GaleriaGateway } from "../../dominio/gateway/galeriaGateway";
import { ImagemGateway } from "../../dominio/gateway/imagemGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { logger } from "../../helpers/logger";

export type ExcluirFotoGaleriaInputDto = {
  id: string;
};

export type ExcluirFotoGaleriaOutputDto = {
  id: string;
  excluido: boolean;
};

export class ExcluirFotoGaleria
  implements CasoDeUso<ExcluirFotoGaleriaInputDto, ExcluirFotoGaleriaOutputDto> {
  private constructor(
    private readonly galeriaGateway: GaleriaGateway,
    private readonly imagemGateway: ImagemGateway,
  ) {}

  public static criar(galeriaGateway: GaleriaGateway, imagemGateway: ImagemGateway) {
    return new ExcluirFotoGaleria(galeriaGateway, imagemGateway);
  }

  public async executar(input: ExcluirFotoGaleriaInputDto): Promise<ExcluirFotoGaleriaOutputDto> {
    const foto = await this.galeriaGateway.buscarPorId(input.id);
    if (!foto) {
      throw ErroPersonalizado.criar({
        mensagem: "Foto da galeria não encontrada.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const excluido = await this.galeriaGateway.excluir(input.id);
    if (!excluido) {
      throw ErroPersonalizado.criar({
        mensagem: "Foto da galeria não encontrada.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    try {
      await this.imagemGateway.excluirPorUrl(foto.url);
    } catch (erro) {
      logger.warn({ erro, fotoId: foto.id, url: foto.url }, "Falha ao excluir imagem da galeria no S3");
    }

    return { id: input.id, excluido: true };
  }
}
