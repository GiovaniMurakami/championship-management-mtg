import { ArtigoGateway, ConteudoArtigoGateway } from "../../dominio/gateway/artigoGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeEditarArtigo, podePublicarArtigo } from "../../helpers/artigo/permissoesArtigo";

export type EditarArtigoInputDto = {
  id: string;
  requisitanteId: string;
  role: string;
  titulo?: string;
  chamada?: string;
  descricao?: string;
  tags?: string[];
  capaUrl?: string | null;
  conteudo?: string;
  publicarAgora?: boolean;
};

export type EditarArtigoOutputDto = {
  id: string;
  status: string;
  titulo: string;
};

export class EditarArtigo implements CasoDeUso<EditarArtigoInputDto, EditarArtigoOutputDto> {
  private constructor(
    private readonly artigoGateway: ArtigoGateway,
    private readonly conteudoGateway: ConteudoArtigoGateway,
  ) {}

  public static criar(artigoGateway: ArtigoGateway, conteudoGateway: ConteudoArtigoGateway) {
    return new EditarArtigo(artigoGateway, conteudoGateway);
  }

  public async executar(input: EditarArtigoInputDto): Promise<EditarArtigoOutputDto> {
    if (!podeEditarArtigo(input.role)) {
      throw ErroPersonalizado.criar({
        mensagem: "Sem permissão para editar artigos.",
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

    const isAdmin = podePublicarArtigo(input.role);
    if (!isAdmin && artigo.autorId !== input.requisitanteId) {
      throw ErroPersonalizado.criar({
        mensagem: "Só o autor ou um administrador pode editar este artigo.",
        status: StatusErro.erroProibido,
      });
    }

    if (input.titulo !== undefined) artigo.titulo = input.titulo.trim();
    if (input.chamada !== undefined) artigo.chamada = input.chamada.trim();
    if (input.descricao !== undefined) artigo.descricao = input.descricao.trim();
    if (input.tags !== undefined) artigo.tags = input.tags.map((t) => t.trim()).filter(Boolean);
    if (input.capaUrl !== undefined) artigo.capaUrl = input.capaUrl?.trim() || undefined;

    if (input.conteudo !== undefined) {
      const conteudo = input.conteudo.trim();
      if (!conteudo) {
        throw ErroPersonalizado.criar({
          mensagem: "Conteúdo do artigo não pode ficar vazio.",
          status: StatusErro.erroParametro,
        });
      }
      const chaveRascunho = `artigos/${artigo.id}/conteudo-rascunho-${Date.now()}.txt`;
      await this.conteudoGateway.gravar(chaveRascunho, conteudo);
      artigo.conteudoS3Key = chaveRascunho;
    }

    const publicarAgora = Boolean(input.publicarAgora) && isAdmin;
    if (publicarAgora) {
      artigo.status = "publicado";
      artigo.conteudoPublicadoS3Key = artigo.conteudoS3Key;
      artigo.publicadoEm = artigo.publicadoEm ?? new Date();
    } else if (!isAdmin) {
      const jaPublicado = Boolean(artigo.conteudoPublicadoS3Key) || artigo.status === "publicado" || artigo.status === "pendente_edicao";
      artigo.status = jaPublicado ? "pendente_edicao" : "pendente";
    }

    artigo.atualizadoEm = new Date();
    await this.artigoGateway.salvar(artigo);
    return { id: artigo.id, status: artigo.status, titulo: artigo.titulo };
  }
}
