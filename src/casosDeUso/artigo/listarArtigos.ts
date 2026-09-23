import { ArtigoGateway } from "../../dominio/gateway/artigoGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { toUsuarioPublico } from "../../helpers/torneio/resolverNomeJogador";
import { podeEditarArtigo, podePublicarArtigo } from "../../helpers/artigo/permissoesArtigo";
import { StatusArtigo } from "../../dominio/entidade/artigo";

export type ListarArtigosInputDto = {
  requisitanteId?: string;
  role?: string;
  status?: StatusArtigo | StatusArtigo[];
  pendentes?: boolean;
};

export type ArtigoResumoDto = {
  id: string;
  titulo: string;
  chamada: string;
  descricao: string;
  tags: string[];
  capaUrl?: string;
  status: string;
  visualizacoes: number;
  publicadoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  autor: { id: string; nome: string; excluido: boolean; fotoUrl?: string; descricaoAssinatura?: string };
};

export class ListarArtigos implements CasoDeUso<ListarArtigosInputDto, { artigos: ArtigoResumoDto[]; total: number }> {
  private constructor(
    private readonly artigoGateway: ArtigoGateway,
    private readonly usuarioGateway: UsuarioGateway,
  ) {}

  public static criar(artigoGateway: ArtigoGateway, usuarioGateway: UsuarioGateway) {
    return new ListarArtigos(artigoGateway, usuarioGateway);
  }

  public async executar(input: ListarArtigosInputDto) {
    const isStaff = podeEditarArtigo(input.role);
    const isAdmin = podePublicarArtigo(input.role);

    let statusFiltro: StatusArtigo | StatusArtigo[] | undefined = ["publicado", "pendente_edicao"];
    if (input.pendentes && isAdmin) {
      statusFiltro = ["pendente", "pendente_edicao"];
    } else if (input.status && isStaff) {
      statusFiltro = input.status;
    } else if (isStaff && !input.status && !input.pendentes) {
      statusFiltro = undefined;
    }

    let artigos = await this.artigoGateway.listar(statusFiltro ? { status: statusFiltro } : undefined);

    if (!isStaff) {
      artigos = artigos.filter((a) => a.status === "publicado" || a.status === "pendente_edicao");
    } else if (!isAdmin && !input.pendentes) {
      artigos = artigos.filter((a) =>
        a.status === "publicado" || a.status === "pendente_edicao" || a.autorId === input.requisitanteId
      );
    }

    const autores = await this.usuarioGateway.buscarVarios([...new Set(artigos.map((a) => a.autorId))]);
    const porId = new Map(autores.map((u) => [u.id, u]));

    const saida = artigos.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      chamada: a.chamada,
      descricao: a.descricao,
      tags: a.tags,
      capaUrl: a.capaUrl,
      status: a.status,
      visualizacoes: a.visualizacoes,
      publicadoEm: a.publicadoEm ? a.publicadoEm.toISOString() : null,
      criadoEm: a.criadoEm.toISOString(),
      atualizadoEm: a.atualizadoEm.toISOString(),
      autor: {
        ...toUsuarioPublico(porId.get(a.autorId), a.autorId, "nome"),
        fotoUrl: porId.get(a.autorId)?.excluido ? undefined : porId.get(a.autorId)?.fotoUrl,
        descricaoAssinatura: porId.get(a.autorId)?.excluido ? undefined : porId.get(a.autorId)?.descricaoAssinatura,
      },
    }));

    return { artigos: saida, total: saida.length };
  }
}
