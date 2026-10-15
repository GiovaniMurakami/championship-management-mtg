import { FotoGaleria } from "../../dominio/entidade/fotoGaleria";
import { GaleriaGateway } from "../../dominio/gateway/galeriaGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

export type CadastrarFotoGaleriaInputDto = {
  url: string;
  urlThumb?: string;
  titulo?: string;
  usuarioId: string;
};

export type CadastrarFotoGaleriaOutputDto = {
  id: string;
  url: string;
  urlThumb: string;
  titulo: string;
  criadoPorId: string;
  criadoEm: string;
};

function assertWebp(url: string, rotulo: string) {
  if (!url.toLowerCase().includes(".webp")) {
    throw ErroPersonalizado.criar({
      mensagem: `${rotulo} da galeria deve estar em WebP.`,
      status: StatusErro.erroParametro,
    });
  }
}

export class CadastrarFotoGaleria
  implements CasoDeUso<CadastrarFotoGaleriaInputDto, CadastrarFotoGaleriaOutputDto> {
  private constructor(private readonly galeriaGateway: GaleriaGateway) {}

  public static criar(galeriaGateway: GaleriaGateway) {
    return new CadastrarFotoGaleria(galeriaGateway);
  }

  public async executar(input: CadastrarFotoGaleriaInputDto): Promise<CadastrarFotoGaleriaOutputDto> {
    const url = input.url.trim();
    if (!url) {
      throw ErroPersonalizado.criar({
        mensagem: "URL da imagem é obrigatória.",
        status: StatusErro.erroParametro,
      });
    }
    assertWebp(url, "A foto");

    const urlThumb = (input.urlThumb || "").trim();
    if (urlThumb) assertWebp(urlThumb, "A miniatura");

    const foto = FotoGaleria.criar({
      url,
      urlThumb: urlThumb || undefined,
      titulo: input.titulo,
      criadoPorId: input.usuarioId,
    });

    await this.galeriaGateway.salvar(foto);

    return {
      id: foto.id,
      url: foto.url,
      urlThumb: foto.urlThumb || foto.url,
      titulo: foto.titulo,
      criadoPorId: foto.criadoPorId,
      criadoEm: toBrasiliaISO(foto.criadoEm)!,
    };
  }
}
