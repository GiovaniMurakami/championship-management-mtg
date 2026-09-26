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
  comentarioPaiId?: string;
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
    let comentarioPaiId: string | null = null;
    if (input.comentarioPaiId) {
      const pai = await this.artigoGateway.buscarComentario(input.artigoId, input.comentarioPaiId);
      if (!pai) {
        throw ErroPersonalizado.criar({
          mensagem: "Comentário não encontrado.",
          status: StatusErro.erroNaoEncontrado,
        });
      }
      comentarioPaiId = pai.comentarioPaiId || pai.id;
    }
    const comentario = ComentarioArtigo.criar({
      artigoId: input.artigoId,
      autorId: input.autorId,
      texto,
      comentarioPaiId,
    });
    await this.artigoGateway.salvarComentario(comentario);
    const autor = await this.usuarioGateway.buscarPorId(input.autorId);
    return {
      id: comentario.id,
      texto: comentario.texto,
      comentarioPaiId: comentario.comentarioPaiId,
      criadoEm: comentario.criadoEm.toISOString(),
      totalCurtidas: 0,
      curtidoPorMim: false,
      autor: {
        ...toUsuarioPublico(autor, input.autorId, "nome"),
        fotoUrl: autor?.excluido ? undefined : autor?.fotoUrl,
      },
    };
  }
}
