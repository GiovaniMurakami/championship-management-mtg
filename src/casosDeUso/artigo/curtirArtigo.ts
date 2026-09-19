import { ArtigoGateway } from "../../dominio/gateway/artigoGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type CurtirArtigoInputDto = {
  artigoId: string;
  usuarioId: string;
  curtir: boolean;
};

export class CurtirArtigo implements CasoDeUso<CurtirArtigoInputDto, { totalCurtidas: number; curtidoPorMim: boolean }> {
  private constructor(private readonly artigoGateway: ArtigoGateway) {}

  public static criar(artigoGateway: ArtigoGateway) {
    return new CurtirArtigo(artigoGateway);
  }

  public async executar(input: CurtirArtigoInputDto) {
    const artigo = await this.artigoGateway.buscarPorId(input.artigoId);
    if (!artigo || (artigo.status !== "publicado" && artigo.status !== "pendente_edicao")) {
      throw ErroPersonalizado.criar({
        mensagem: "Artigo não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }
    if (input.curtir) await this.artigoGateway.curtir(input.artigoId, input.usuarioId);
    else await this.artigoGateway.descurtir(input.artigoId, input.usuarioId);
    const curtidas = await this.artigoGateway.listarCurtidas(input.artigoId);
    return {
      totalCurtidas: curtidas.length,
      curtidoPorMim: curtidas.includes(input.usuarioId),
    };
  }
}
