import { Artigo } from "../../dominio/entidade/artigo";
import { ArtigoGateway, ConteudoArtigoGateway } from "../../dominio/gateway/artigoGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeEditarArtigo, podePublicarArtigo } from "../../helpers/artigo/permissoesArtigo";

export type CriarArtigoInputDto = {
  autorId: string;
  role: string;
  titulo: string;
  chamada?: string;
  descricao?: string;
  tags?: string[];
  capaUrl?: string;
  conteudo: string;
  publicarAgora?: boolean;
};

export type CriarArtigoOutputDto = {
  id: string;
  status: string;
  titulo: string;
};

export class CriarArtigo implements CasoDeUso<CriarArtigoInputDto, CriarArtigoOutputDto> {
  private constructor(
    private readonly artigoGateway: ArtigoGateway,
    private readonly conteudoGateway: ConteudoArtigoGateway,
  ) {}

  public static criar(artigoGateway: ArtigoGateway, conteudoGateway: ConteudoArtigoGateway) {
    return new CriarArtigo(artigoGateway, conteudoGateway);
  }

  public async executar(input: CriarArtigoInputDto): Promise<CriarArtigoOutputDto> {
    if (!podeEditarArtigo(input.role)) {
      throw ErroPersonalizado.criar({
        mensagem: "Sem permissão para criar artigos.",
        status: StatusErro.erroProibido,
      });
    }

    const titulo = input.titulo.trim();
    if (!titulo) {
      throw ErroPersonalizado.criar({
        mensagem: "Título é obrigatório.",
        status: StatusErro.erroParametro,
      });
    }
    const conteudo = String(input.conteudo ?? "").trim();
    if (!conteudo) {
      throw ErroPersonalizado.criar({
        mensagem: "Conteúdo do artigo é obrigatório.",
        status: StatusErro.erroParametro,
      });
    }

    const publicarAgora = Boolean(input.publicarAgora) && podePublicarArtigo(input.role);
    const artigo = Artigo.criar({
      autorId: input.autorId,
      titulo,
      chamada: (input.chamada ?? "").trim(),
      descricao: (input.descricao ?? "").trim(),
      tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
      capaUrl: input.capaUrl?.trim() || undefined,
      conteudoS3Key: "pending",
      status: publicarAgora ? "publicado" : "pendente",
      publicadoEm: publicarAgora ? new Date() : null,
    });

    const chave = `artigos/${artigo.id}/conteudo.txt`;
    await this.conteudoGateway.gravar(chave, conteudo);
    artigo.conteudoS3Key = chave;
    if (publicarAgora) artigo.conteudoPublicadoS3Key = chave;

    await this.artigoGateway.salvar(artigo);
    return { id: artigo.id, status: artigo.status, titulo: artigo.titulo };
  }
}
