import { CasoDeUso } from "../casoDeUso";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type RefazerRodadaInputDto = {
  torneioId: string;
  donoId: string;
  isAdmin: boolean;
};

export type RefazerRodadaOutputDto = {
  rodadaAtual: number;
  rodadaRemovida: number;
  partidasRemovidas: number;
  emCorte: boolean;
  totalRodadas: number;
};

function calcularEstadoAnteriorCorte(rodadaAtual: number, totalRodadas: number, corteTop?: number) {
  if (!corteTop || corteTop < 2) {
    return { emCorte: false, totalRodadas };
  }

  const rodadasCorte = Math.log2(corteTop);
  if (!Number.isInteger(rodadasCorte)) {
    return { emCorte: false, totalRodadas };
  }

  const primeiraRodadaCorte = totalRodadas - rodadasCorte + 1;
  const rodadaAnterior = rodadaAtual - 1;

  if (rodadaAnterior < primeiraRodadaCorte) {
    return { emCorte: false, totalRodadas: rodadaAnterior };
  }

  return { emCorte: true, totalRodadas };
}

export class RefazerRodada implements CasoDeUso<RefazerRodadaInputDto, RefazerRodadaOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly partidaGateway: PartidaGateway,
  ) {}

  public static criar(torneioGateway: TorneioGateway, partidaGateway: PartidaGateway) {
    return new RefazerRodada(torneioGateway, partidaGateway);
  }

  public async executar(input: RefazerRodadaInputDto): Promise<RefazerRodadaOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio nÃ£o encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (torneio.donoId !== input.donoId && !input.isAdmin) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o dono do torneio pode refazer rodadas.",
        status: StatusErro.erroProibido,
      });
    }

    if (torneio.status !== "em_andamento") {
      throw ErroPersonalizado.criar({
        mensagem: "Somente torneios em andamento podem refazer rodada.",
        status: StatusErro.erroParametro,
      });
    }

    if (torneio.rodadaAtual <= 1) {
      throw ErroPersonalizado.criar({
        mensagem: "NÃ£o hÃ¡ rodada anterior para retornar.",
        status: StatusErro.erroParametro,
      });
    }

    const rodadaRemovida = torneio.rodadaAtual;
    const rodadaAnterior = rodadaRemovida - 1;
    const partidasRodadaAtual = await this.partidaGateway.listarPorTorneioERodada(
      input.torneioId,
      rodadaRemovida,
    );

    if (partidasRodadaAtual.length === 0) {
      throw ErroPersonalizado.criar({
        mensagem: `NÃ£o existem partidas na rodada ${rodadaRemovida} para remover.`,
        status: StatusErro.erroParametro,
      });
    }

    const estadoAnterior = torneio.emCorte
      ? calcularEstadoAnteriorCorte(rodadaRemovida, torneio.totalRodadas, torneio.corteTop)
      : { emCorte: false, totalRodadas: torneio.totalRodadas };

    const partidasRemovidas = await this.partidaGateway.excluirPorTorneioERodada(
      input.torneioId,
      rodadaRemovida,
    );

    torneio.voltarRodada(rodadaAnterior, estadoAnterior.totalRodadas, estadoAnterior.emCorte);
    await this.torneioGateway.atualizar(torneio);

    return {
      rodadaAtual: rodadaAnterior,
      rodadaRemovida,
      partidasRemovidas,
      emCorte: torneio.emCorte,
      totalRodadas: torneio.totalRodadas,
    };
  }
}
