import { CasoDeUso } from "../casoDeUso";
import { ArquetipoResumo, RecenteTorneio } from "./agregarMetagame";
import { carregarEAgregarMetagame, MetagameGateways } from "./carregarMetagame";

export type ListarMetagameInputDto = {
  formato: string;
  dias?: number;
};

export type ListarMetagameOutputDto = {
  formato: string;
  dias: number;
  totalDecks: number;
  totalTorneios: number;
  arquetipos: ArquetipoResumo[];
  recentes: RecenteTorneio[];
};

export class ListarMetagame implements CasoDeUso<ListarMetagameInputDto, ListarMetagameOutputDto> {
  private constructor(private readonly gateways: MetagameGateways) {}

  public static criar(
    torneio: MetagameGateways["torneio"],
    inscricao: MetagameGateways["inscricao"],
    partida: MetagameGateways["partida"],
    deck: MetagameGateways["deck"],
    usuario: MetagameGateways["usuario"]
  ) {
    return new ListarMetagame({ torneio, inscricao, partida, deck, usuario });
  }

  public async executar(input: ListarMetagameInputDto): Promise<ListarMetagameOutputDto> {
    const agregado = await carregarEAgregarMetagame(this.gateways, input.formato, input.dias ?? 30);
    return {
      formato: agregado.formato,
      dias: agregado.dias,
      totalDecks: agregado.totalDecks,
      totalTorneios: agregado.totalTorneios,
      arquetipos: agregado.arquetipos,
      recentes: agregado.recentes,
    };
  }
}
