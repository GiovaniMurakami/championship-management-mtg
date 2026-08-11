import { CasoDeUso } from "../casoDeUso";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";

export type AjustarTotalRodadasInputDto = {
  torneioId: string;
  usuarioId: string;
  isAdmin: boolean;
  totalRodadas: number;
};

export type AjustarTotalRodadasOutputDto = {
  torneioId: string;
  rodadaAtual: number;
  totalRodadasAnterior: number;
  totalRodadas: number;
  emCorte: boolean;
};

const MAX_TOTAL_RODADAS = 30;

export class AjustarTotalRodadas
  implements CasoDeUso<AjustarTotalRodadasInputDto, AjustarTotalRodadasOutputDto>
{
  private constructor(private readonly torneioGateway: TorneioGateway) {}

  public static criar(torneioGateway: TorneioGateway) {
    return new AjustarTotalRodadas(torneioGateway);
  }

  public async executar(
    input: AjustarTotalRodadasInputDto
  ): Promise<AjustarTotalRodadasOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (!podeGerenciarTorneio(torneio, input.usuarioId, input.isAdmin)) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o dono, anfitrião ou administrador pode ajustar o total de rodadas.",
        status: StatusErro.erroProibido,
      });
    }

    if (torneio.status !== "em_andamento") {
      throw ErroPersonalizado.criar({
        mensagem: "Só é possível ajustar rodadas com o torneio em andamento.",
        status: StatusErro.erroParametro,
      });
    }

    if (torneio.emCorte) {
      throw ErroPersonalizado.criar({
        mensagem: "Não é possível alterar o total de rodadas durante o corte.",
        status: StatusErro.erroParametro,
      });
    }

    const novoTotal = Number(input.totalRodadas);
    if (!Number.isInteger(novoTotal) || novoTotal < 1 || novoTotal > MAX_TOTAL_RODADAS) {
      throw ErroPersonalizado.criar({
        mensagem: `Informe um total de rodadas entre 1 e ${MAX_TOTAL_RODADAS}.`,
        status: StatusErro.erroParametro,
      });
    }

    if (novoTotal < torneio.rodadaAtual) {
      throw ErroPersonalizado.criar({
        mensagem: `O total de rodadas não pode ser menor que a rodada atual (${torneio.rodadaAtual}).`,
        status: StatusErro.erroParametro,
      });
    }

    if (novoTotal === torneio.totalRodadas) {
      return {
        torneioId: torneio.id,
        rodadaAtual: torneio.rodadaAtual,
        totalRodadasAnterior: torneio.totalRodadas,
        totalRodadas: torneio.totalRodadas,
        emCorte: torneio.emCorte,
      };
    }

    const totalAnterior = torneio.totalRodadas;
    torneio.totalRodadas = novoTotal;
    await this.torneioGateway.atualizar(torneio);

    return {
      torneioId: torneio.id,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadasAnterior: totalAnterior,
      totalRodadas: torneio.totalRodadas,
      emCorte: torneio.emCorte,
    };
  }
}
