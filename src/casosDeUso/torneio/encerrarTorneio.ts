import { CasoDeUso } from "../casoDeUso";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";

export type EncerrarTorneioInputDto = {
  torneioId: string;
  usuarioId: string;
  isAdmin: boolean;
};

export type EncerrarTorneioOutputDto = {
  torneioId: string;
  status: string;
  rodadaAtual: number;
  totalRodadas: number;
  finalizado: true;
};

/**
 * Encerra o torneio imediatamente com o estado atual (sem gerar mais Swiss/corte).
 * Standings finais são os da rodada corrente.
 */
export class EncerrarTorneio
  implements CasoDeUso<EncerrarTorneioInputDto, EncerrarTorneioOutputDto>
{
  private constructor(private readonly torneioGateway: TorneioGateway) {}

  public static criar(torneioGateway: TorneioGateway) {
    return new EncerrarTorneio(torneioGateway);
  }

  public async executar(
    input: EncerrarTorneioInputDto
  ): Promise<EncerrarTorneioOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (!podeGerenciarTorneio(torneio, input.usuarioId, input.isAdmin)) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o dono, anfitrião ou administrador pode encerrar o torneio.",
        status: StatusErro.erroProibido,
      });
    }

    if (torneio.status !== "em_andamento") {
      throw ErroPersonalizado.criar({
        mensagem: "Só é possível encerrar torneios em andamento.",
        status: StatusErro.erroParametro,
      });
    }

    // Congela o calendário na rodada atual para o histórico ficar coerente
    torneio.totalRodadas = Math.max(torneio.totalRodadas, torneio.rodadaAtual);
    torneio.finalizar();
    await this.torneioGateway.atualizar(torneio);
    eventosTorneio.emit("torneio_finalizado", {
      torneioId: torneio.id,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
    });

    return {
      torneioId: torneio.id,
      status: torneio.status,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
      finalizado: true,
    };
  }
}
