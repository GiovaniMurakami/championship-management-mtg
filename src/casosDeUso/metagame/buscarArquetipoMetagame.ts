import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { ArquetipoDetalhe } from "./agregarMetagame";
import { carregarEAgregarMetagame, MetagameGateways } from "./carregarMetagame";

export type BuscarArquetipoMetagameInputDto = {
  formato: string;
  slug: string;
  dias?: number;
};

export type BuscarArquetipoMetagameOutputDto = ArquetipoDetalhe & {
  formato: string;
  dias: number;
};

export class BuscarArquetipoMetagame
  implements CasoDeUso<BuscarArquetipoMetagameInputDto, BuscarArquetipoMetagameOutputDto>
{
  private constructor(private readonly gateways: MetagameGateways) {}

  public static criar(
    torneio: MetagameGateways["torneio"],
    inscricao: MetagameGateways["inscricao"],
    partida: MetagameGateways["partida"],
    deck: MetagameGateways["deck"],
    usuario: MetagameGateways["usuario"]
  ) {
    return new BuscarArquetipoMetagame({ torneio, inscricao, partida, deck, usuario });
  }

  public async executar(
    input: BuscarArquetipoMetagameInputDto
  ): Promise<BuscarArquetipoMetagameOutputDto> {
    const slug = (input.slug || "").trim().toLowerCase();
    if (!slug) {
      throw ErroPersonalizado.criar({
        mensagem: "slug é obrigatório.",
        status: StatusErro.erroParametro,
      });
    }

    const agregado = await carregarEAgregarMetagame(this.gateways, input.formato, input.dias ?? 30);
    const detalhe = agregado.porSlug.get(slug);
    if (!detalhe) {
      throw ErroPersonalizado.criar({
        mensagem: "Arquétipo não encontrado neste período.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    return {
      formato: agregado.formato,
      dias: agregado.dias,
      ...detalhe,
    };
  }
}
