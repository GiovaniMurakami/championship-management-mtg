import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";
import { EventoTorneioGateway, eventoTorneioPadrao } from "../../dominio/gateway/eventoTorneioGateway";

export type ExcluirTorneioInputDto = {
  id: string;
  requisitanteId: string;
  isAdmin: boolean;
};

export type ExcluirTorneioOutputDto = {
  mensagem: string;
};

export class ExcluirTorneio
  implements CasoDeUso<ExcluirTorneioInputDto, ExcluirTorneioOutputDto> {
  private constructor(private readonly torneioGateway: TorneioGateway,
    private readonly eventos: EventoTorneioGateway,) {}

  public static criar(torneioGateway: TorneioGateway,
    eventos: EventoTorneioGateway = eventoTorneioPadrao()) {
    return new ExcluirTorneio(torneioGateway, eventos);
  }

  public async executar(input: ExcluirTorneioInputDto): Promise<ExcluirTorneioOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.id);

    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (!podeGerenciarTorneio(torneio, input.requisitanteId, input.isAdmin)) {
      throw ErroPersonalizado.criar({
        mensagem: "Sem permissão para excluir este torneio.",
        status: StatusErro.erroProibido,
      });
    }

    if (torneio.status !== "inscricoes_abertas") {
      throw ErroPersonalizado.criar({
        mensagem: "Só é possível excluir torneios com inscrições abertas.",
        status: StatusErro.erroParametro,
      });
    }

    await this.torneioGateway.excluir(input.id);
    this.eventos.publicar("torneio_excluido", {
      torneioId: input.id,
    });

    return { mensagem: "Torneio excluído com sucesso." };
  }
}
