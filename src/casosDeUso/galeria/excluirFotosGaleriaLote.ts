import { GaleriaGateway } from "../../dominio/gateway/galeriaGateway";
import { ImagemGateway } from "../../dominio/gateway/imagemGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { logger } from "../../helpers/logger";

export type ExcluirFotosGaleriaLoteInputDto = {
  ids: string[];
};

export type ExcluirFotosGaleriaLoteOutputDto = {
  excluidos: string[];
  total: number;
};

export class ExcluirFotosGaleriaLote
  implements CasoDeUso<ExcluirFotosGaleriaLoteInputDto, ExcluirFotosGaleriaLoteOutputDto> {
  private constructor(
    private readonly galeriaGateway: GaleriaGateway,
    private readonly imagemGateway: ImagemGateway,
  ) {}

  public static criar(galeriaGateway: GaleriaGateway, imagemGateway: ImagemGateway) {
    return new ExcluirFotosGaleriaLote(galeriaGateway, imagemGateway);
  }

  public async executar(input: ExcluirFotosGaleriaLoteInputDto): Promise<ExcluirFotosGaleriaLoteOutputDto> {
    const ids = [...new Set(input.ids.map((id) => String(id || "").trim()).filter(Boolean))];
    if (!ids.length) {
      throw ErroPersonalizado.criar({
        mensagem: "Informe ao menos uma foto para excluir.",
        status: StatusErro.erroParametro,
      });
    }

    const excluidos: string[] = [];

    for (const id of ids) {
      const foto = await this.galeriaGateway.buscarPorId(id);
      if (!foto) continue;

      const ok = await this.galeriaGateway.excluir(id);
      if (!ok) continue;

      excluidos.push(id);
      const urlsS3 = [...new Set([foto.url, foto.urlThumb].filter(Boolean))];
      for (const url of urlsS3) {
        try {
          await this.imagemGateway.excluirPorUrl(url);
        } catch (erro) {
          logger.warn({ erro, fotoId: foto.id, url }, "Falha ao excluir imagem da galeria no S3");
        }
      }
    }

    if (!excluidos.length) {
      throw ErroPersonalizado.criar({
        mensagem: "Nenhuma foto da galeria foi encontrada para exclusão.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    return { excluidos, total: excluidos.length };
  }
}
