import { ArtigoGateway } from "../../dominio/gateway/artigoGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podePublicarArtigo } from "../../helpers/artigo/permissoesArtigo";

export type AprovarArtigoInputDto = {
  id: string;
  role: string;
  aprovar: boolean;
};

export type AprovarArtigoOutputDto = {
  id: string;
  status: string;
};

export class AprovarArtigo implements CasoDeUso<AprovarArtigoInputDto, AprovarArtigoOutputDto> {
  private constructor(private readonly artigoGateway: ArtigoGateway) {}

  public static criar(artigoGateway: ArtigoGateway) {
    return new AprovarArtigo(artigoGateway);
  }

  public async executar(input: AprovarArtigoInputDto): Promise<AprovarArtigoOutputDto> {
    if (!podePublicarArtigo(input.role)) {
      throw ErroPersonalizado.criar({
        mensagem: "Somente administradores podem aprovar artigos.",
        status: StatusErro.erroProibido,
      });
    }

    const artigo = await this.artigoGateway.buscarPorId(input.id);
    if (!artigo) {
      throw ErroPersonalizado.criar({
        mensagem: "Artigo não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (input.aprovar) {
      artigo.status = "publicado";
      artigo.conteudoPublicadoS3Key = artigo.conteudoS3Key;
      artigo.publicadoEm = artigo.publicadoEm ?? new Date();
    } else {
      artigo.status = "rejeitado";
    }
    artigo.atualizadoEm = new Date();
    await this.artigoGateway.salvar(artigo);
    return { id: artigo.id, status: artigo.status };
  }
}
