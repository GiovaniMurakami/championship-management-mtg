import { CasoDeUso } from "../casoDeUso";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { StandingsGateway } from "../../dominio/gateway/standingsGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";

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
    private readonly standingsGateway: StandingsGateway,
  ) {}

  public static criar(
    torneioGateway: TorneioGateway,
    partidaGateway: PartidaGateway,
    standingsGateway: StandingsGateway,
  ) {
    return new RefazerRodada(torneioGateway, partidaGateway, standingsGateway);
  }

  public async executar(input: RefazerRodadaInputDto): Promise<RefazerRodadaOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (!podeGerenciarTorneio(torneio, input.donoId, input.isAdmin)) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o dono, anfitrião ou administrador do torneio pode refazer rodadas.",
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
        mensagem: "Não há rodada anterior para retornar.",
        status: StatusErro.erroParametro,
      });
    }

    const rodadaRemovida = torneio.rodadaAtual;
    const rodadaAnterior = rodadaRemovida - 1;
    const rodadaEsperada = rodadaRemovida;
    const partidasRodadaAtual = await this.partidaGateway.listarPorTorneioERodada(
      input.torneioId,
      rodadaRemovida,
    );

    if (partidasRodadaAtual.length === 0) {
      throw ErroPersonalizado.criar({
        mensagem: `Não existem partidas na rodada ${rodadaRemovida} para remover.`,
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

    // Remove snapshot consolidado da rodada à qual voltamos (recriado no próximo avanço)
    await this.standingsGateway.excluirPorTorneioERodada(input.torneioId, rodadaAnterior);

    torneio.voltarRodada(rodadaAnterior, estadoAnterior.totalRodadas, estadoAnterior.emCorte);
    const ok = await this.torneioGateway.atualizarSe(torneio, { rodadaEsperada });
    if (!ok) {
      throw ErroPersonalizado.criar({
        mensagem: "A rodada já foi alterada por outra requisição. Atualize a página.",
        status: StatusErro.erroConflito,
      });
    }

    return {
      rodadaAtual: rodadaAnterior,
      rodadaRemovida,
      partidasRemovidas,
      emCorte: torneio.emCorte,
      totalRodadas: torneio.totalRodadas,
    };
  }
}
