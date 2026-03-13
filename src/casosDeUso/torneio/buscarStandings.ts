import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import {
  calcularEstatisticas,
  ordenarPorDesempate,
  mwp,
  omwp,
  gwp,
  ogwp,
} from "./swiss";

export type BuscarStandingsInputDto = {
  torneioId: string;
};

export type BuscarStandingsOutputDto = {
  torneioId: string;
  rodadaAtual: number;
  totalRodadas: number;
  status: string;
  standings: Array<{
    posicao: number;
    usuarioId: string;
    pontosMesa: number;
    vitoriasPartida: number;
    empatesPartida: number;
    derrotasPartida: number;
    mwp: number;
    omwp: number;
    gwp: number;
    ogwp: number;
    checkInProximaRodada: boolean;
    dropped: boolean;
  }>;
};

export class BuscarStandings
  implements CasoDeUso<BuscarStandingsInputDto, BuscarStandingsOutputDto>
{
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly partidaGateway: PartidaGateway
  ) {}

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    partidaGateway: PartidaGateway
  ) {
    return new BuscarStandings(torneioGateway, inscricaoGateway, partidaGateway);
  }

  public async executar(
    input: BuscarStandingsInputDto
  ): Promise<BuscarStandingsOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (torneio.status === "inscricoes_abertas") {
      throw ErroPersonalizado.criar({
        mensagem: "O torneio ainda não foi iniciado.",
        status: StatusErro.erroParametro,
      });
    }

    const [inscricoes, todasPartidas] = await Promise.all([
      this.inscricaoGateway.listarPorTorneio(input.torneioId),
      this.partidaGateway.listarPorTorneio(input.torneioId),
    ]);

    const jogadoresIds = inscricoes
      .filter((i) => i.checkIn)
      .map((i) => i.usuarioId);

    const inscricaoMap = new Map(inscricoes.map((i) => [i.usuarioId, i]));

    const statsMap = calcularEstatisticas(jogadoresIds, todasPartidas);
    const ordenados = ordenarPorDesempate(
      Array.from(statsMap.values()),
      statsMap
    );

    return {
      torneioId: torneio.id,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
      status: torneio.status,
      standings: ordenados.map((s, idx) => ({
        posicao: idx + 1,
        usuarioId: s.usuarioId,
        pontosMesa: s.pontosMesa,
        vitoriasPartida: s.vitoriasPartida,
        empatesPartida: s.empatesPartida,
        derrotasPartida: s.derrotasPartida,
        mwp: mwp(s),
        omwp: omwp(s, statsMap),
        gwp: gwp(s),
        ogwp: ogwp(s, statsMap),
        checkInProximaRodada:
          (inscricaoMap.get(s.usuarioId)?.checkInRodada ?? -1) >= torneio.rodadaAtual,
        dropped: inscricaoMap.get(s.usuarioId)?.dropped ?? false,
      })),
    };
  }
}
