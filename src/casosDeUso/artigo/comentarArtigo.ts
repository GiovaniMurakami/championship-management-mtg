import { ComentarioArtigo } from "../../dominio/entidade/artigo";
import { ArtigoGateway } from "../../dominio/gateway/artigoGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toUsuarioPublico } from "../../helpers/torneio/resolverNomeJogador";

export type ComentarArtigoInputDto = {
  artigoId: string;
  autorId: string;
  texto: string;
};

export class ComentarArtigo implements CasoDeUso<ComentarArtigoInputDto, Record<string, unknown>> {
  private constructor(
    private readonly artigoGateway: ArtigoGateway,
    private readonly usuarioGateway: UsuarioGateway,
  ) {}

  public static criar(artigoGateway: ArtigoGateway, usuarioGateway: UsuarioGateway) {
    return new ComentarArtigo(artigoGateway, usuarioGateway);
  }

  public async executar(input: ComentarArtigoInputDto) {
    const artigo = await this.artigoGateway.buscarPorId(input.artigoId);
    if (!artigo || (artigo.status !== "publicado" && artigo.status !== "pendente_edicao")) {
      throw ErroPersonalizado.criar({
        mensagem: "Artigo não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }
    const texto = input.texto.trim();
    if (!texto) {
      throw ErroPersonalizado.criar({
        mensagem: "Comentário vazio.",
        status: StatusErro.erroParametro,
      });
    }
    const comentario = ComentarioArtigo.criar({
      artigoId: input.artigoId,
      autorId: input.autorId,
      texto,
    });
    await this.artigoGateway.salvarComentario(comentario);
    const autor = await this.usuarioGateway.buscarPorId(input.autorId);
    return {
      id: comentario.id,
      texto: comentario.texto,
      criadoEm: comentario.criadoEm.toISOString(),
      autor: {
        ...toUsuarioPublico(autor, input.autorId, "nome"),
        fotoUrl: autor?.excluido ? undefined : autor?.fotoUrl,
      },
    };
  }
}
