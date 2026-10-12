import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { EventoTorneioGateway, eventoTorneioPadrao } from "../../dominio/gateway/eventoTorneioGateway";

export type FixarTorneioInputDto = {
  torneioId: string;
  fixado: boolean;
};

export class FixarTorneio implements CasoDeUso<FixarTorneioInputDto, { id: string; fixado: boolean }> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly eventos: EventoTorneioGateway,
  ) {}

  public static criar(
    torneioGateway: TorneioGateway,
    eventos: EventoTorneioGateway = eventoTorneioPadrao(),
  ) {
    return new FixarTorneio(torneioGateway, eventos);
  }

  public async executar(input: FixarTorneioInputDto) {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    torneio.fixado = input.fixado;
    await this.torneioGateway.atualizar(torneio);
    this.eventos.publicar("torneio_alterado", { torneioId: torneio.id });

    return { id: torneio.id, fixado: torneio.fixado };
  }
}
