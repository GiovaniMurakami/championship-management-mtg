import { CasoDeUso } from "../casoDeUso";
import { ArtigoGateway } from "../../dominio/gateway/artigoGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { detectarImageType, sanitizarDescricaoSeo } from "../torneio/buscarSeoTorneio";
import { buscarArtigoPorIdOuSlug } from "./buscarArtigo";

export type BuscarSeoArtigoInputDto = {
  artigoId: string;
};

export type BuscarSeoArtigoOutputDto = {
  artigoId: string;
  title: string;
  image: string | null;
  imageType: string | null;
  description: string | null;
};

export class BuscarSeoArtigo implements CasoDeUso<BuscarSeoArtigoInputDto, BuscarSeoArtigoOutputDto> {
  private constructor(private readonly artigoGateway: ArtigoGateway) {}

  public static criar(artigoGateway: ArtigoGateway) {
    return new BuscarSeoArtigo(artigoGateway);
  }

  public async executar(input: BuscarSeoArtigoInputDto): Promise<BuscarSeoArtigoOutputDto> {
    const artigo = await buscarArtigoPorIdOuSlug(this.artigoGateway, input.artigoId);
    const publico = artigo?.status === "publicado" || artigo?.status === "pendente_edicao";
    if (!artigo || !publico) {
      throw ErroPersonalizado.criar({
        mensagem: "Artigo não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const image = artigo.capaUrl?.trim() || null;
    return {
      artigoId: artigo.id,
      title: artigo.titulo,
      image,
      imageType: detectarImageType(image),
      description: sanitizarDescricaoSeo(artigo.chamada || artigo.descricao),
    };
  }
}
