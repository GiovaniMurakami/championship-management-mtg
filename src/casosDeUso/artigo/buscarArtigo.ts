import { ArtigoGateway, ConteudoArtigoGateway } from "../../dominio/gateway/artigoGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toUsuarioPublico } from "../../helpers/torneio/resolverNomeJogador";
import { podeEditarArtigo, podePublicarArtigo } from "../../helpers/artigo/permissoesArtigo";

export type BuscarArtigoInputDto = {
  id: string;
  requisitanteId?: string;
  role?: string;
  registrarVisualizacao?: boolean;
};

export class BuscarArtigo implements CasoDeUso<BuscarArtigoInputDto, Record<string, unknown>> {
  private constructor(
    private readonly artigoGateway: ArtigoGateway,
    private readonly conteudoGateway: ConteudoArtigoGateway,
    private readonly usuarioGateway: UsuarioGateway,
  ) {}

  public static criar(
    artigoGateway: ArtigoGateway,
    conteudoGateway: ConteudoArtigoGateway,
    usuarioGateway: UsuarioGateway,
  ) {
    return new BuscarArtigo(artigoGateway, conteudoGateway, usuarioGateway);
  }

  public async executar(input: BuscarArtigoInputDto) {
    const artigo = await this.artigoGateway.buscarPorId(input.id);
    if (!artigo) {
      throw ErroPersonalizado.criar({
        mensagem: "Artigo não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const isAdmin = podePublicarArtigo(input.role);
    const isAutor = artigo.autorId === input.requisitanteId;
    const isStaff = podeEditarArtigo(input.role);
    const podeVerRascunho = isAdmin || (isStaff && isAutor);

    if (artigo.status !== "publicado" && artigo.status !== "pendente_edicao" && !podeVerRascunho) {
      throw ErroPersonalizado.criar({
        mensagem: "Artigo não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const chavePublica = artigo.chaveConteudoPublico();
    const chaveLeitura = podeVerRascunho ? artigo.conteudoS3Key : chavePublica;
    const conteudo = chaveLeitura ? await this.conteudoGateway.ler(chaveLeitura) : null;
    const conteudoPublicado = chavePublica && chavePublica !== chaveLeitura
      ? await this.conteudoGateway.ler(chavePublica)
      : ((artigo.status === "publicado" || artigo.status === "pendente_edicao") ? conteudo : null);

    if (input.registrarVisualizacao && (artigo.status === "publicado" || artigo.status === "pendente_edicao")) {
      artigo.visualizacoes = await this.artigoGateway.incrementarVisualizacoes(artigo.id);
    }

    const [autor, comentarios, curtidas] = await Promise.all([
      this.usuarioGateway.buscarPorId(artigo.autorId),
      this.artigoGateway.listarComentarios(artigo.id),
      this.artigoGateway.listarCurtidas(artigo.id),
    ]);

    const autoresComentario = await this.usuarioGateway.buscarVarios(
      [...new Set(comentarios.map((c) => c.autorId))]
    );
    const autorPorId = new Map(autoresComentario.map((u) => [u.id, u]));

    return {
      id: artigo.id,
      titulo: artigo.titulo,
      chamada: artigo.chamada,
      descricao: artigo.descricao,
      tags: artigo.tags,
      capaUrl: artigo.capaUrl,
      status: artigo.status,
      visualizacoes: artigo.visualizacoes,
      conteudo: conteudo ?? "",
      conteudoPublicado: conteudoPublicado ?? ((artigo.status === "publicado" || artigo.status === "pendente_edicao") ? conteudo : null),
      publicadoEm: artigo.publicadoEm ? artigo.publicadoEm.toISOString() : null,
      criadoEm: artigo.criadoEm.toISOString(),
      atualizadoEm: artigo.atualizadoEm.toISOString(),
      autor: {
        ...toUsuarioPublico(autor, artigo.autorId, "nome"),
        fotoUrl: autor?.excluido ? undefined : autor?.fotoUrl,
      },
      totalCurtidas: curtidas.length,
      curtidoPorMim: Boolean(input.requisitanteId && curtidas.includes(input.requisitanteId)),
      comentarios: comentarios.map((c) => ({
        id: c.id,
        texto: c.texto,
        criadoEm: c.criadoEm.toISOString(),
        autor: {
          ...toUsuarioPublico(autorPorId.get(c.autorId), c.autorId, "nome"),
          fotoUrl: autorPorId.get(c.autorId)?.excluido ? undefined : autorPorId.get(c.autorId)?.fotoUrl,
        },
      })),
    };
  }
}
