import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type BuscarSeoTorneioInputDto = {
  torneioId: string;
};

export type BuscarSeoTorneioOutputDto = {
  torneioId: string;
  title: string;
  image: string | null;
  description: string | null;
  url: string | null;
};

export class BuscarSeoTorneio
  implements CasoDeUso<BuscarSeoTorneioInputDto, BuscarSeoTorneioOutputDto> {
  private constructor(private readonly torneioGateway: TorneioGateway) { }

  public static criar(torneioGateway: TorneioGateway) {
    return new BuscarSeoTorneio(torneioGateway);
  }

  public async executar(input: BuscarSeoTorneioInputDto): Promise<BuscarSeoTorneioOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio nao encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    return {
      torneioId: torneio.id,
      title: torneio.nome,
      image: torneio.bannerUrl?.trim() || null,
      description: torneio.descricao?.trim() || null,
      url: torneio.linkBanner?.trim() || null,
    };
  }
}
