import { Torneio } from "../../dominio/entidade/torneio";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";

export type CriarTorneioInputDto = {
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
  premio?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  linkLive?: string;
};

export type CriarTorneioOutputDto = {
  id: string;
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
  status: string;
  premio?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  linkLive?: string;
  criadoEm: Date;
};

export class CriarTorneio
  implements CasoDeUso<CriarTorneioInputDto, CriarTorneioOutputDto> {
  private constructor(private readonly torneioGateway: TorneioGateway) { }

  public static criar(torneioGateway: TorneioGateway) {
    return new CriarTorneio(torneioGateway);
  }

  public async executar(
    input: CriarTorneioInputDto
  ): Promise<CriarTorneioOutputDto> {
    const torneio = Torneio.criar({
      nome: input.nome.trim(),
      horario: input.horario,
      formato: input.formato.toLowerCase().trim(),
      donoId: input.donoId,
      premio: input.premio?.trim(),
      bannerUrl: input.bannerUrl?.trim(),
      linkBanner: input.linkBanner?.trim(),
      somRodada: input.somRodada?.trim(),
      maxJogadores: input.maxJogadores,
      maxRodadas: input.maxRodadas,
      corteTop: input.corteTop,
      linkLive: input.linkLive?.trim(),
    });

    await this.torneioGateway.salvar(torneio);

    return {
      id: torneio.id,
      nome: torneio.nome,
      horario: torneio.horario,
      formato: torneio.formato,
      donoId: torneio.donoId,
      status: torneio.status,
      premio: torneio.premio,
      bannerUrl: torneio.bannerUrl,
      linkBanner: torneio.linkBanner,
      somRodada: torneio.somRodada,
      maxJogadores: torneio.maxJogadores,
      maxRodadas: torneio.maxRodadas,
      corteTop: torneio.corteTop,
      linkLive: torneio.linkLive,
      criadoEm: torneio.criadoEm,
    };
  }
}
