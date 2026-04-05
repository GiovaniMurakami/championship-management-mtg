import { Torneio } from "../../dominio/entidade/torneio";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

const CORTES_VALIDOS = [2, 4, 8, 16];

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
  secreto?: boolean;
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
  secreto: boolean;
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
    if (input.corteTop !== undefined && !CORTES_VALIDOS.includes(input.corteTop)) {
      throw ErroPersonalizado.criar({
        mensagem: `O corte deve ser 2, 4, 8 ou 16. Valor recebido: ${input.corteTop}.`,
        status: StatusErro.erroParametro,
      });
    }

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
      secreto: input.secreto ?? false,
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
      secreto: torneio.secreto,
      criadoEm: torneio.criadoEm,
    };
  }
}
