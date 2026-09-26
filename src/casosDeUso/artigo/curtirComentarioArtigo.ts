import { ArtigoGateway } from "../../dominio/gateway/artigoGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type CurtirComentarioArtigoInputDto = {
  artigoId: string;
  comentarioId: string;
  usuarioId: string;
  curtir: boolean;
};

export class CurtirComentarioArtigo implements CasoDeUso<CurtirComentarioArtigoInputDto, { totalCurtidas: number; curtidoPorMim: boolean }> {
  private constructor(private readonly artigoGateway: ArtigoGateway) {}

  public static criar(artigoGateway: ArtigoGateway) {
    return new CurtirComentarioArtigo(artigoGateway);
  }

  public async executar(input: CurtirComentarioArtigoInputDto) {
    const comentario = await this.artigoGateway.buscarComentario(input.artigoId, input.comentarioId);
    if (!comentario) {
      throw ErroPersonalizado.criar({
        mensagem: "Comentário não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }
    if (input.curtir) {
      await this.artigoGateway.curtirComentario(input.artigoId, input.comentarioId, input.usuarioId);
    } else {
      await this.artigoGateway.descurtirComentario(input.artigoId, input.comentarioId, input.usuarioId);
    }
    const curtidas = (await this.artigoGateway.listarCurtidasComentarios(input.artigoId))
      .filter((item) => item.comentarioId === input.comentarioId)
      .map((item) => item.usuarioId);
    return {
      totalCurtidas: curtidas.length,
      curtidoPorMim: curtidas.includes(input.usuarioId),
    };
  }
}
