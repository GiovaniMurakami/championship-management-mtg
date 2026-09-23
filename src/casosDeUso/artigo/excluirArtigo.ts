import { ArtigoGateway, ConteudoArtigoGateway } from "../../dominio/gateway/artigoGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podePublicarArtigo } from "../../helpers/artigo/permissoesArtigo";

export type ExcluirArtigoInputDto = {
  id: string;
  role: string;
};

export class ExcluirArtigo implements CasoDeUso<ExcluirArtigoInputDto, { mensagem: string }> {
  private constructor(
    private readonly artigoGateway: ArtigoGateway,
    private readonly conteudoGateway: ConteudoArtigoGateway,
  ) {}

  public static criar(artigoGateway: ArtigoGateway, conteudoGateway: ConteudoArtigoGateway) {
    return new ExcluirArtigo(artigoGateway, conteudoGateway);
  }

  public async executar(input: ExcluirArtigoInputDto) {
    if (!podePublicarArtigo(input.role)) {
      throw ErroPersonalizado.criar({
        mensagem: "Somente administradores podem excluir artigos.",
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
    for (const chave of [artigo.conteudoS3Key, artigo.conteudoPublicadoS3Key].filter(Boolean) as string[]) {
      try { await this.conteudoGateway.excluir(chave); } catch { /* ignore */ }
    }
    await this.artigoGateway.excluir(input.id);
    return { mensagem: "Artigo excluído com sucesso." };
  }
}
